import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { QueryConversationsDto } from './dto/query-conversation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all conversations for the authenticated user' })
  async findAll(@Request() req: any, @Query() query: QueryConversationsDto) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.conversationsService.findAllForUser(userId, query);
  }

  @Get('unread-summary')
  @ApiOperation({ summary: 'Get unread counts summary for the authenticated user' })
  async getUnreadSummary(@Request() req: any) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.conversationsService.getUnreadSummary(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new conversation or start direct chat' })
  async create(@Request() req: any, @Body() dto: CreateConversationDto) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    const role = req.user.role || req.user.roles?.[0];
    return this.conversationsService.create(dto, userId, role);
  }

  @Post('application/:applicationId')
  @ApiOperation({ summary: 'Find or create canonical conversation for an application' })
  async findOrCreateApplicationConversation(
    @Request() req: any,
    @Param('applicationId') applicationId: string,
  ) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    const role = req.user.role || req.user.roles?.[0];
    return this.conversationsService.findOrCreateApplicationConversation(
      applicationId,
      userId,
      role,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    const role = req.user.role || req.user.roles?.[0];
    return this.conversationsService.findOne(id, userId, role);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.conversationsService.markAsRead(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update conversation settings (mute, archive)' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.conversationsService.update(id, dto, userId);
  }
}
