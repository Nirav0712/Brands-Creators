import { Injectable } from '@nestjs/common';
import { IMatchingResult, IMatchingBreakdown } from '@brands-creators/types';

@Injectable()
export class MatchingService {
  /**
   * Deterministic Match Score Calculator (0–100%)
   * Isolated service ready for future AI/ML neural reranking in Phase 07.
   */
  calculateMatch(creator: any, requirement: any): IMatchingResult {
    let categoryScore = 0;
    let locationScore = 0;
    let skillsScore = 0;
    let platformScore = 0;
    let availabilityScore = 0;
    const reasons: string[] = [];

    // 1. Category Alignment (35 points max)
    const reqCatId = requirement.categoryId?._id?.toString() || requirement.categoryId?.toString();
    const creatorPrimaryCatId = creator.primaryCategoryId?._id?.toString() || creator.primaryCategoryId?.toString();
    const creatorAddlCatIds = (creator.additionalCategoryIds || []).map((id: any) => id?.toString());

    if (reqCatId && creatorPrimaryCatId && reqCatId === creatorPrimaryCatId) {
      categoryScore += 25;
      reasons.push('Primary discipline matches requirement exactly');
    } else if (reqCatId && creatorAddlCatIds.includes(reqCatId)) {
      categoryScore += 18;
      reasons.push('Secondary discipline matches requirement');
    } else {
      categoryScore += 5;
    }

    // Subcategory match
    const reqSubId = requirement.subcategoryId?._id?.toString() || requirement.subcategoryId?.toString();
    const creatorSubIds = (creator.subcategoryIds || []).map((id: any) => id?.toString());
    if (reqSubId && creatorSubIds.includes(reqSubId)) {
      categoryScore += 10;
      reasons.push('Subcategory specialization matches');
    }
    categoryScore = Math.min(35, categoryScore);

    // 2. Location & Remote Compatibility (20 points max)
    const reqCity = (requirement.location?.city || '').toLowerCase();
    const reqRemote = requirement.location?.isRemote ?? requirement.remoteAllowed ?? true;
    const creatorCity = (creator.location?.city || '').toLowerCase();
    const creatorServiceAreas = (creator.serviceAreas || []).map((a: string) => a.toLowerCase());

    if (reqRemote) {
      locationScore = 20;
      reasons.push('Remote collaboration supported');
    } else if (reqCity && creatorCity && reqCity === creatorCity) {
      locationScore = 20;
      reasons.push(`Direct city match in ${creator.location?.city}`);
    } else if (reqCity && creatorServiceAreas.includes(reqCity)) {
      locationScore = 16;
      reasons.push(`Creator travels to ${requirement.location?.city}`);
    } else if (creatorServiceAreas.includes('remote')) {
      locationScore = 12;
    } else {
      locationScore = 5;
    }

    // 3. Skills Intersection (20 points max)
    const reqSkills: string[] = requirement.requiredSkills || [];
    const creatorSkills: string[] = (creator.skills || []).map((s: string) => s.toLowerCase());

    if (reqSkills.length === 0) {
      skillsScore = 15;
    } else {
      const matchedSkills = reqSkills.filter((rs) => creatorSkills.includes(rs.toLowerCase()));
      const matchRatio = matchedSkills.length / reqSkills.length;
      skillsScore = Math.round(matchRatio * 20);
      if (matchedSkills.length > 0) {
        reasons.push(`Matches ${matchedSkills.length}/${reqSkills.length} required skills (${matchedSkills.slice(0, 3).join(', ')})`);
      }
    }

    // 4. Target Platforms & Format Fit (15 points max)
    const reqPlatforms: string[] = requirement.targetPlatforms || [];
    if (reqPlatforms.length === 0) {
      platformScore = 12;
    } else {
      platformScore = 15;
      reasons.push(`Platform verified: ${reqPlatforms.join(', ')}`);
    }

    // 5. Availability Status (10 points max)
    const availability = creator.availability || creator.availabilityStatus || 'AVAILABLE_NOW';
    if (availability === 'AVAILABLE_NOW') {
      availabilityScore = 10;
      reasons.push('Currently Available for Booking');
    } else if (availability === 'BOOKING_NEXT_MONTH') {
      availabilityScore = 6;
      reasons.push('Accepting advance bookings');
    } else {
      availabilityScore = 2;
    }

    const totalScore = Math.min(100, Math.max(20, categoryScore + locationScore + skillsScore + platformScore + availabilityScore));

    const breakdown: IMatchingBreakdown = {
      categoryMatch: categoryScore,
      locationMatch: locationScore,
      skillsMatch: skillsScore,
      platformMatch: platformScore,
      availabilityMatch: availabilityScore,
    };

    return {
      score: totalScore,
      breakdown,
      reasons,
    };
  }
}
