import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole, UserStatus } from '@brands-creators/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  async findAll(filter: PaginationQueryDto & { role?: UserRole; status?: UserStatus }) {
    const query: any = {};
    if (filter.role) {
      query.roles = filter.role;
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ fullName: regex }, { username: regex }, { email: regex }];
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-passwordHash -refreshTokenHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(query),
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

  async findById(id: string) {
    const user = await this.userModel.findById(id).select('-passwordHash -refreshTokenHash').lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserStatus(id: string, status: UserStatus) {
    const user = await this.userModel.findByIdAndUpdate(id, { status }, { new: true }).select('-passwordHash -refreshTokenHash');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserRoles(id: string, roles: UserRole[]) {
    const user = await this.userModel.findByIdAndUpdate(id, { roles }, { new: true }).select('-passwordHash -refreshTokenHash');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async seedSuperAdmin() {
    const adminEmail = this.configService.get<string>('superAdmin.email') || 'admin@brandsandcreators.com';
    const exists = await this.userModel.findOne({ email: adminEmail.toLowerCase() });

    if (!exists) {
      this.logger.log(`Seeding Super Admin user: ${adminEmail}`);
      const adminPassword = this.configService.get<string>('superAdmin.password') || 'SuperAdmin@Brands2026!';
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      await this.userModel.create({
        email: adminEmail.toLowerCase(),
        username: 'superadmin',
        fullName: this.configService.get<string>('superAdmin.name') || 'Brands & Creators Super Admin',
        passwordHash,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      });

      this.logger.log('Super Admin seeded successfully!');
    }
  }
}
