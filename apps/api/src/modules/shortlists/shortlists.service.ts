import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shortlist, ShortlistDocument } from './schemas/shortlist.schema';
import { BrandProfile, BrandProfileDocument } from '../brands/schemas/brand.schema';

@Injectable()
export class ShortlistsService {
  constructor(
    @InjectModel(Shortlist.name) private readonly shortlistModel: Model<ShortlistDocument>,
    @InjectModel(BrandProfile.name) private readonly brandModel: Model<BrandProfileDocument>,
  ) {}

  async getMyShortlists(userId: string): Promise<any[]> {
    const brand = await this.brandModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!brand) return [];

    return this.shortlistModel
      .find({ brandId: brand._id })
      .populate({
        path: 'creatorProfileIds',
        populate: [
          { path: 'userId', select: 'fullName username avatarUrl' },
          { path: 'primaryCategoryId', select: 'name slug' },
        ],
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async createShortlist(userId: string, name: string, description?: string, requirementId?: string): Promise<any> {
    let brand = await this.brandModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!brand) {
      brand = await this.brandModel.create({
        userId: new Types.ObjectId(userId),
        companyName: 'Brand Account',
        slug: `brand-${Date.now()}`,
        description: 'Brand account on Brands & Creators.',
        industry: 'General',
        location: { city: 'Mumbai', country: 'India' },
      });
    }

    const shortlist = new this.shortlistModel({
      brandId: brand._id,
      requirementId: requirementId ? new Types.ObjectId(requirementId) : undefined,
      name,
      description,
      creatorProfileIds: [],
    });

    return shortlist.save();
  }

  async toggleCreatorInShortlist(userId: string, shortlistId: string, creatorProfileId: string): Promise<any> {
    const brand = await this.brandModel.findOne({ userId: new Types.ObjectId(userId) });
    const shortlist = await this.shortlistModel.findById(shortlistId);

    if (!shortlist || !brand || shortlist.brandId.toString() !== brand._id.toString()) {
      throw new NotFoundException('Shortlist not found');
    }

    const cId = new Types.ObjectId(creatorProfileId);
    const index = shortlist.creatorProfileIds.findIndex((id) => id.toString() === creatorProfileId);

    if (index > -1) {
      shortlist.creatorProfileIds.splice(index, 1);
    } else {
      shortlist.creatorProfileIds.push(cId);
    }

    return shortlist.save();
  }
}
