import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductionTeamProfile, ProductionTeamProfileDocument } from './schemas/production-team.schema';
import { ProductionFilterDto, UpdateProductionProfileDto } from './dto/production-team.dto';
import { ProfileVisibility, VerificationStatus } from '@brands-creators/types';
import { AddPortfolioItemDto } from '../creators/dto/creator.dto';

@Injectable()
export class ProductionTeamsService {
  constructor(
    @InjectModel(ProductionTeamProfile.name)
    private readonly prodModel: Model<ProductionTeamProfileDocument>,
  ) {}

  async findAll(filter: ProductionFilterDto) {
    const query: any = {};

    if (filter.visibilityStatus) {
      query.visibilityStatus = filter.visibilityStatus;
    } else {
      query.visibilityStatus = ProfileVisibility.PUBLISHED;
    }

    if (filter.specialty) {
      query.specialties = { $regex: new RegExp(filter.specialty, 'i') };
    }

    if (filter.city) {
      query['location.city'] = { $regex: new RegExp(filter.city, 'i') };
    }

    if (filter.verificationStatus) {
      query.verificationStatus = filter.verificationStatus;
    }

    if (filter.minRate !== undefined || filter.maxRate !== undefined) {
      query.startingDayRate = {};
      if (filter.minRate !== undefined) query.startingDayRate.$gte = Number(filter.minRate);
      if (filter.maxRate !== undefined) query.startingDayRate.$lte = Number(filter.maxRate);
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [
        { studioName: regex },
        { description: regex },
        { tagline: regex },
        { specialties: regex },
        { equipmentRoster: regex },
      ];
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filter.limit) || 12));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prodModel
        .find(query)
        .populate('userId', 'fullName email avatarUrl')
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.prodModel.countDocuments(query),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const team = await this.prodModel
      .findOne({ slug: slug.toLowerCase() })
      .populate('userId', 'fullName email avatarUrl phone')
      .lean()
      .exec();

    if (!team) {
      throw new NotFoundException(`Production studio '${slug}' not found`);
    }
    return team;
  }

  async findByUserId(userId: string) {
    return this.prodModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'fullName email avatarUrl phone')
      .lean()
      .exec();
  }

  async saveDraft(userId: string, dto: Partial<UpdateProductionProfileDto>) {
    let team = await this.prodModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!team) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedSlug = `studio-${randomSuffix}`;

      team = new this.prodModel({
        userId: new Types.ObjectId(userId),
        studioName: dto.studioName || 'Creative Production House',
        slug: generatedSlug,
        description: dto.description || '',
        teamSize: dto.teamSize || 3,
        location: dto.location || { city: 'Mumbai', country: 'India' },
        visibilityStatus: ProfileVisibility.DRAFT,
      });
    }

    Object.assign(team, dto);
    return team.save();
  }

  async updateProfile(userId: string, data: UpdateProductionProfileDto) {
    const team = await this.prodModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!team) {
      throw new NotFoundException('Production team profile not found');
    }
    Object.assign(team, data);
    return team.save();
  }

  async publishProfile(userId: string) {
    const team = await this.prodModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!team) {
      throw new NotFoundException('Production team profile not found');
    }
    team.visibilityStatus = ProfileVisibility.PUBLISHED;
    return team.save();
  }

  async pauseProfile(userId: string) {
    const team = await this.prodModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!team) {
      throw new NotFoundException('Production team profile not found');
    }
    team.visibilityStatus = ProfileVisibility.PAUSED;
    return team.save();
  }

  async addPortfolioItem(userId: string, dto: AddPortfolioItemDto) {
    const team = await this.prodModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!team) {
      throw new NotFoundException('Production team profile not found');
    }
    team.portfolio.push(dto as any);
    return team.save();
  }

  async removePortfolioItem(userId: string, itemId: string) {
    const team = await this.prodModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!team) {
      throw new NotFoundException('Production team profile not found');
    }
    team.portfolio = team.portfolio.filter((p: any) => p._id?.toString() !== itemId) as any;
    return team.save();
  }

  // Admin Moderation Methods
  async updateVerification(id: string, status: VerificationStatus) {
    return this.prodModel.findByIdAndUpdate(id, { verificationStatus: status }, { new: true });
  }

  async suspendProfile(id: string) {
    return this.prodModel.findByIdAndUpdate(
      id,
      { visibilityStatus: ProfileVisibility.SUSPENDED },
      { new: true },
    );
  }

  async restoreProfile(id: string) {
    return this.prodModel.findByIdAndUpdate(
      id,
      { visibilityStatus: ProfileVisibility.PUBLISHED },
      { new: true },
    );
  }
}

