import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformSettingsService } from './platform-settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { UserRole } from '@brands-creators/types';

@ApiTags('Platform Settings')
@Controller('settings')
export class PlatformSettingsController {
  constructor(private readonly settingsService: PlatformSettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all platform settings' })
  async getSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a specific public or platform setting' })
  async getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a platform setting (Super Admin only)' })
  async updateSetting(
    @CurrentUser() user: UserDocument,
    @Param('key') key: string,
    @Body() body: { value: any },
  ) {
    return this.settingsService.updateSetting(key, body.value, user.fullName || user.username);
  }
}
