import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { MediaService, UploadedMulterFile } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('sign-upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate secure signed upload parameters for Cloudinary' })
  async getUploadSignature(@Body() body: { folder?: string; tags?: string[] }) {
    return this.mediaService.getUploadSignature(body.folder, body.tags);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and update user profile avatar' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB hard limit
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: UserDocument,
    @UploadedFile() file: UploadedMulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('No image file uploaded.');
    }
    return this.mediaService.saveAvatar(user._id.toString(), file);
  }

  @Get('avatars/:filename')
  @ApiOperation({ summary: 'Retrieve and stream avatar image file' })
  async serveAvatar(@Param('filename') filename: string, @Res() res: Response) {
    const { filePath, mime } = this.mediaService.getAvatarFilePath(filename);
    res.setHeader('Content-Type', mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
    res.sendFile(filePath);
  }

  @Delete('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove user profile avatar' })
  async removeAvatar(@CurrentUser() user: UserDocument) {
    return this.mediaService.deleteAvatar(user._id.toString());
  }
}
