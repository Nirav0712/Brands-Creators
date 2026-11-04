import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreatorProfile, CreatorProfileDocument } from '../creators/schemas/creator.schema';
import { BrandProfile, BrandProfileDocument } from '../brands/schemas/brand.schema';

export interface UploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(CreatorProfile.name) private readonly creatorModel: Model<CreatorProfileDocument>,
    @InjectModel(BrandProfile.name) private readonly brandModel: Model<BrandProfileDocument>,
  ) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.logger.log('Cloudinary successfully initialized');
    } else {
      this.logger.warn('Cloudinary credentials not configured. Media signature will operate in mock/local mode.');
    }
  }

  getUploadSignature(folder = 'brands-creators', tags?: string[]) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret') || 'dev_secret';
    const apiKey = this.configService.get<string>('cloudinary.apiKey') || 'dev_key';
    const cloudName = this.configService.get<string>('cloudinary.cloudName') || 'brands-creators';

    const paramsToSign: Record<string, any> = {
      folder,
      timestamp,
    };

    if (tags && tags.length > 0) {
      paramsToSign.tags = tags.join(',');
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      timestamp,
      signature,
      apiKey,
      cloudName,
      folder,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    };
  }

  validateImageBuffer(buffer: Buffer, originalname: string, mimetype: string): { ext: string; mime: string } {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds the 5 MB limit.');
    }

    // Check magic bytes
    let detectedExt = '';
    let detectedMime = '';

    // JPEG: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      detectedExt = 'jpg';
      detectedMime = 'image/jpeg';
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    else if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      detectedExt = 'png';
      detectedMime = 'image/png';
    }
    // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
    else if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      detectedExt = 'webp';
      detectedMime = 'image/webp';
    }

    if (!detectedExt) {
      throw new BadRequestException(
        'Invalid file type. Only authentic JPEG, PNG, and WebP images are permitted.',
      );
    }

    // Enforce filename extension validation
    const extMatch = (path.extname(originalname) || '').toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (extMatch && !allowedExtensions.includes(extMatch)) {
      throw new BadRequestException(`File extension ${extMatch} does not match permitted image extensions.`);
    }

    return { ext: detectedExt, mime: detectedMime };
  }

  async saveAvatar(userId: string, file: UploadedMulterFile) {
    const { ext } = this.validateImageBuffer(file.buffer, file.originalname, file.mimetype);

    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    // If user previously had an avatar file stored locally, clean up orphaned file
    if (user.avatarUrl && user.avatarUrl.includes('/media/avatars/')) {
      const prevFilename = path.basename(user.avatarUrl.split('?')[0]);
      if (/^avatar-[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp)$/.test(prevFilename)) {
        const prevPath = path.join(uploadDir, prevFilename);
        if (fs.existsSync(prevPath)) {
          try {
            fs.unlinkSync(prevPath);
          } catch (e) {
            this.logger.warn(`Failed to clean up previous avatar ${prevPath}: ${e}`);
          }
        }
      }
    }

    const safeFilename = `avatar-${userId}-${Date.now()}.${ext}`;
    const targetPath = path.join(uploadDir, safeFilename);

    await fs.promises.writeFile(targetPath, file.buffer);

    const avatarUrl = `/api/v1/media/avatars/${safeFilename}`;
    user.avatarUrl = avatarUrl;
    await user.save();

    // Sync to brand profile if linked
    if (user.brandProfileId) {
      await this.brandModel.findByIdAndUpdate(user.brandProfileId, { logoUrl: avatarUrl });
    }

    return {
      success: true,
      avatarUrl,
      user: {
        _id: user._id.toString(),
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        roles: user.roles,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async deleteAvatar(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    if (user.avatarUrl && user.avatarUrl.includes('/media/avatars/')) {
      const prevFilename = path.basename(user.avatarUrl.split('?')[0]);
      if (/^avatar-[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp)$/.test(prevFilename)) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
        const prevPath = path.join(uploadDir, prevFilename);
        if (fs.existsSync(prevPath)) {
          try {
            fs.unlinkSync(prevPath);
          } catch (e) {
            this.logger.warn(`Failed to clean up avatar ${prevPath}: ${e}`);
          }
        }
      }
    }

    user.avatarUrl = undefined;
    await user.save();

    if (user.brandProfileId) {
      await this.brandModel.findByIdAndUpdate(user.brandProfileId, { logoUrl: undefined });
    }

    return {
      success: true,
      message: 'Profile image removed successfully.',
      user: {
        _id: user._id.toString(),
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        roles: user.roles,
        avatarUrl: null,
      },
    };
  }

  getAvatarFilePath(filename: string): { filePath: string; mime: string } {
    // Prevent directory traversal attacks
    if (!/^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp)$/.test(filename)) {
      throw new BadRequestException('Invalid filename identifier.');
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    const filePath = path.join(uploadDir, path.basename(filename));

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Avatar file not found.');
    }

    const ext = path.extname(filename).toLowerCase();
    let mime = 'image/jpeg';
    if (ext === '.png') mime = 'image/png';
    else if (ext === '.webp') mime = 'image/webp';

    return { filePath, mime };
  }
}
