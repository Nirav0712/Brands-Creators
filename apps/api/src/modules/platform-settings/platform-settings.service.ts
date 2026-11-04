import { Injectable, OnModuleInit, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlatformSetting, PlatformSettingDocument } from './schemas/platform-setting.schema';

@Injectable()
export class PlatformSettingsService implements OnModuleInit {
  private readonly logger = new Logger(PlatformSettingsService.name);

  constructor(
    @InjectModel(PlatformSetting.name)
    private readonly settingModel: Model<PlatformSettingDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultSettings();
  }

  async getAllSettings() {
    return this.settingModel.find().lean().exec();
  }

  async getSetting(key: string) {
    const item = await this.settingModel.findOne({ key }).lean().exec();
    if (!item) {
      throw new NotFoundException(`Setting '${key}' not found`);
    }
    return item;
  }

  async updateSetting(key: string, value: any, updatedBy: string) {
    return this.settingModel.findOneAndUpdate(
      { key },
      { value, updatedBy },
      { new: true, upsert: true },
    );
  }

  private async seedDefaultSettings() {
    const defaults = [
      {
        key: 'PLATFORM_COMMISSION_PERCENTAGE',
        value: 5,
        description: 'Default platform service fee percentage on closed projects',
      },
      {
        key: 'MAX_PROPOSALS_PER_DAY_CREATOR',
        value: 15,
        description: 'Maximum daily proposals a creator can submit without pro plan',
      },
      {
        key: 'AUTO_APPROVE_CREATORS',
        value: false,
        description: 'Whether new creator profiles require manual admin moderation',
      },
      {
        key: 'MAINTENANCE_MODE',
        value: false,
        description: 'Global maintenance mode flag for maintenance windows',
      },
    ];

    for (const setting of defaults) {
      const exists = await this.settingModel.findOne({ key: setting.key });
      if (!exists) {
        await this.settingModel.create(setting);
      } else if (setting.key === 'PLATFORM_COMMISSION_PERCENTAGE' && exists.value !== 5) {
        exists.value = 5;
        await exists.save();
      }
    }
  }
}
