import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatorProfile, CreatorProfileDocument } from '../creators/schemas/creator.schema';
import { Requirement, RequirementDocument } from '../requirements/schemas/requirement.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import {
  ProposalPitchDto,
  ProposalTone,
  OptimizeBriefDto,
} from './dto/ai.dto';
import {
  IAiSemanticMatchResult,
  IAiProposalPitchResult,
  IAiBriefOptimizationResult,
  VerificationStatus,
} from '@brands-creators/types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectModel(CreatorProfile.name) private readonly creatorModel: Model<CreatorProfileDocument>,
    @InjectModel(Requirement.name) private readonly reqModel: Model<RequirementDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  /**
   * Evaluates deep multi-dimensional semantic compatibility between Creator and Requirement
   */
  async calculateSemanticMatch(requirementId: string, applicantId: string): Promise<IAiSemanticMatchResult> {
    const requirement = await this.reqModel
      .findById(requirementId)
      .populate('categoryId', 'name slug')
      .lean()
      .exec();

    if (!requirement) {
      throw new NotFoundException('Requirement brief not found');
    }

    let creator = await this.creatorModel
      .findById(applicantId)
      .populate('primaryCategoryId', 'name slug')
      .lean()
      .exec();

    if (!creator && Types.ObjectId.isValid(applicantId)) {
      creator = await this.creatorModel
        .findOne({ userId: new Types.ObjectId(applicantId) })
        .populate('primaryCategoryId', 'name slug')
        .lean()
        .exec();
    }

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    // 1. Category Fit (0–30)
    let categoryFit = 10;
    const reqCatName = (requirement.categoryId as any)?.name?.toLowerCase() || '';
    const creatorCatName = (creator.primaryCategoryId as any)?.name?.toLowerCase() || '';
    if (reqCatName && creatorCatName && (reqCatName.includes(creatorCatName) || creatorCatName.includes(reqCatName))) {
      categoryFit = 30;
    } else if (creator.skills?.some((s) => s.toLowerCase().includes(reqCatName))) {
      categoryFit = 22;
    }

    // 2. Skills Alignment (0–30)
    let skillsAlignment = 10;
    const reqSkills: string[] = (requirement.requiredSkills || []).map((s: string) => s.toLowerCase());
    const creatorSkills: string[] = (creator.skills || []).map((s: string) => s.toLowerCase());

    if (reqSkills.length === 0) {
      skillsAlignment = 24;
    } else {
      const matched = reqSkills.filter((rs) =>
        creatorSkills.some((cs) => cs.includes(rs) || rs.includes(cs)),
      );
      const ratio = matched.length / reqSkills.length;
      skillsAlignment = Math.min(30, Math.round(ratio * 30));
    }

    // 3. Rate Compatibility (0–20)
    let rateCompatibility = 15;
    const reqBudgetMax = requirement.budget?.max || requirement.budget?.min || 50000;
    const creatorRate = creator.startingPrice || 10000;
    if (creatorRate <= reqBudgetMax) {
      rateCompatibility = 20;
    } else if (creatorRate <= reqBudgetMax * 1.25) {
      rateCompatibility = 14;
    } else {
      rateCompatibility = 8;
    }

    // 4. Portfolio Relevance & Trust (0–20)
    let portfolioRelevance = 10;
    if (creator.verificationStatus === VerificationStatus.VERIFIED) {
      portfolioRelevance += 6;
    }
    if ((creator.portfolio?.length || 0) >= 3) {
      portfolioRelevance += 4;
    }
    portfolioRelevance = Math.min(20, portfolioRelevance);

    const overallScore = Math.min(100, Math.max(25, categoryFit + skillsAlignment + rateCompatibility + portfolioRelevance));

    // Structured Insights
    const strengths: string[] = [];
    const considerations: string[] = [];

    if (categoryFit >= 25) {
      strengths.push(`Specialist in ${creatorCatName || 'matching category'}`);
    }
    if (skillsAlignment >= 20) {
      strengths.push(`Verified overlap with ${Math.round((skillsAlignment / 30) * 100)}% of required skills`);
    }
    if (creator.verificationStatus === VerificationStatus.VERIFIED) {
      strengths.push('Identity and past commercial deliverables verified by platform');
    }
    if (creatorRate <= reqBudgetMax) {
      strengths.push('Pricing expectations fit comfortably within the approved campaign budget');
    }

    if (skillsAlignment < 18 && reqSkills.length > 0) {
      considerations.push('Specific sub-specializations may require preliminary style test');
    }
    if (creatorRate > reqBudgetMax) {
      considerations.push('Creator starting rate exceeds baseline brief budget tier');
    }
    if ((creator.portfolio?.length || 0) < 2) {
      considerations.push('Limited public portfolio items uploaded on platform');
    }

    if (strengths.length === 0) {
      strengths.push('Active marketplace creator available for booking');
    }

    const recommendationSummary =
      overallScore >= 80
        ? `High-priority match: ${creator.headline || 'Creator'} strongly aligns with brief deliverables and skill requirements.`
        : overallScore >= 60
        ? `Solid contender: Good foundational fit for campaign execution with relevant capabilities.`
        : `Moderate fit: Consider reviewing sample deliverables to confirm style alignment before shortlisting.`;

    return {
      overallScore,
      categoryFit,
      skillsAlignment,
      rateCompatibility,
      portfolioRelevance,
      insights: {
        strengths,
        considerations,
        recommendationSummary,
      },
    };
  }

  /**
   * Generates a tailored, compelling proposal pitch for a creator targeting a specific requirement
   */
  async generateProposalPitch(creatorUserId: string, dto: ProposalPitchDto): Promise<IAiProposalPitchResult> {
    const requirement = await this.reqModel.findById(dto.requirementId).populate('categoryId', 'name').lean().exec();
    if (!requirement) {
      throw new NotFoundException('Requirement brief not found');
    }

    const creator = await this.creatorModel
      .findOne({ userId: new Types.ObjectId(creatorUserId) })
      .populate('primaryCategoryId', 'name')
      .lean()
      .exec();

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const categoryName = (requirement.categoryId as any)?.name || 'Campaign';
    const topSkills = (creator.skills || []).slice(0, 4);
    const suggestedBid = Math.round(
      (requirement.budget?.min || creator.startingPrice || 15000) * 0.95 +
      (requirement.budget?.max || 30000) * 0.05
    );

    let toneGreeting = 'Hi team,';
    let toneClosing = 'Looking forward to collaborating on this campaign!';

    if (dto.tone === ProposalTone.CREATIVE) {
      toneGreeting = 'Hey there! Loved the creative vision in this brief.';
      toneClosing = "Let's create something truly unforgettable together!";
    } else if (dto.tone === ProposalTone.CONFIDENT) {
      toneGreeting = 'Dear Brand Manager, I have executed similar campaigns with proven commercial results.';
      toneClosing = 'Ready to kick off production immediately upon approval.';
    } else if (dto.tone === ProposalTone.CONCISE) {
      toneGreeting = 'Hello, review my tailored delivery plan below:';
      toneClosing = 'Available for a brief intro call anytime.';
    }

    const hook = `${toneGreeting} I saw your brief for "${requirement.title}" and would love to bring my expertise in ${topSkills.join(', ') || categoryName} to deliver exceptional results.`;

    const customContext = dto.customNotes
      ? `\n\nSpecific Focus: ${dto.customNotes}`
      : '';

    const pitchBody = `${hook}\n\nOver the past ${creator.experienceYears || 2}+ years, I have crafted high-converting assets with meticulous attention to pacing, brand voice, and visual storytelling. For this brief, I will focus on clear messaging that directly connects with your audience while respecting all required technical standards.${customContext}\n\n${toneClosing}`;

    const suggestedMilestones = [
      {
        title: 'Milestone 1: Creative Concept & Pre-Production',
        percentage: 30,
        description: 'Moodboards, scripting, shotlist approval, and schedule alignment.',
      },
      {
        title: 'Milestone 2: Production & First Cut Delivery',
        percentage: 40,
        description: 'Complete production, initial color-graded edit, and review draft submission.',
      },
      {
        title: 'Milestone 3: Final Revisions & Master Asset Handover',
        percentage: 30,
        description: 'Incorporating feedback, final mastering, and full commercial asset delivery.',
      },
    ];

    return {
      headline: `Tailored Execution Strategy for ${requirement.title}`,
      hook,
      pitchBody,
      highlightedSkills: topSkills,
      suggestedTurnaroundDays: 7,
      suggestedBid,
      suggestedMilestones,
    };
  }

  /**
   * Analyzes and optimizes a brand's requirement brief before publishing
   */
  async optimizeBrief(dto: OptimizeBriefDto): Promise<IAiBriefOptimizationResult> {
    const titleWords = dto.title.trim().split(/\s+/).length;
    const descLength = dto.description.trim().length;

    let scopeClarityScore = 60;
    if (titleWords >= 4 && titleWords <= 12) scopeClarityScore += 15;
    if (descLength >= 120) scopeClarityScore += 15;
    if (dto.targetBudget && dto.targetBudget > 5000) scopeClarityScore += 10;
    scopeClarityScore = Math.min(100, scopeClarityScore);

    // Keyword detection
    const text = `${dto.title} ${dto.description}`.toLowerCase();
    const suggestedSkills: string[] = [];

    if (text.includes('video') || text.includes('reel') || text.includes('tiktok') || text.includes('shoot')) {
      suggestedSkills.push('Videography', 'Color Grading', 'Sound Design');
    }
    if (text.includes('ugc') || text.includes('skincare') || text.includes('direct response')) {
      suggestedSkills.push('UGC Creation', 'Scriptwriting', 'Hook Ideation');
    }
    if (text.includes('photo') || text.includes('lookbook') || text.includes('product')) {
      suggestedSkills.push('Product Photography', 'Lighting', 'Photo Retouching');
    }
    if (text.includes('influencer') || text.includes('youtube') || text.includes('review')) {
      suggestedSkills.push('Influencer Marketing', 'Content Strategy');
    }

    if (suggestedSkills.length === 0) {
      suggestedSkills.push('Content Creation', 'Brand Storytelling');
    }

    const recommendedCategory = text.includes('ugc')
      ? 'UGC Creators'
      : text.includes('video') || text.includes('commercial')
      ? 'Videography & Cinematography'
      : text.includes('photo')
      ? 'Photography'
      : 'Influencers & Creators';

    const baseMin = dto.targetBudget ? Math.round(dto.targetBudget * 0.8) : 25000;
    const baseMax = dto.targetBudget ? Math.round(dto.targetBudget * 1.5) : 60000;

    const actionableSuggestions: string[] = [];
    if (descLength < 100) {
      actionableSuggestions.push('Add specific target audience and campaign goals to receive more tailored proposals.');
    }
    if (!text.includes('deliverable') && !text.includes('video') && !text.includes('photo')) {
      actionableSuggestions.push('Explicitly list the exact asset dimensions and required deliverable formats (e.g., 9:16 vertical 4K).');
    }
    if (!text.includes('deadline') && !text.includes('timeline')) {
      actionableSuggestions.push('Specify turnaround deadline to set clear expectations for candidate creators.');
    }
    if (actionableSuggestions.length === 0) {
      actionableSuggestions.push('Brief is comprehensive and ready to attract top verified talent.');
    }

    return {
      optimizedTitle: dto.title.includes('—') ? dto.title : `${dto.title} — High-Impact Campaign`,
      recommendedCategory,
      suggestedSkills,
      suggestedBudgetRange: {
        min: baseMin,
        max: baseMax,
        currency: 'INR',
      },
      recommendedDeliverables: [
        'Master 4K Video Export (16:9 & 9:16)',
        '3 Raw Hook Variations for Ad Testing',
        'Commercial License & Clean Audio Stems',
      ],
      scopeClarityScore,
      actionableSuggestions,
    };
  }
}
