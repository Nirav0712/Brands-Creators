import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShortlistsService } from './shortlists.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Shortlists')
@Controller('shortlists')
export class ShortlistsController {
  constructor(private readonly shortlistsService: ShortlistsService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shortlists for current brand' })
  async getMyShortlists(@CurrentUser() user: UserDocument) {
    return this.shortlistsService.getMyShortlists(user._id.toString());
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new shortlist folder' })
  async createShortlist(
    @CurrentUser() user: UserDocument,
    @Body() body: { name: string; description?: string },
  ) {
    return this.shortlistsService.createShortlist(user._id.toString(), body.name, body.description);
  }

  @Post(':id/toggle-creator/:creatorId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add or remove creator from shortlist folder' })
  async toggleCreator(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Param('creatorId') creatorId: string,
  ) {
    return this.shortlistsService.toggleCreatorInShortlist(user._id.toString(), id, creatorId);
  }
}
