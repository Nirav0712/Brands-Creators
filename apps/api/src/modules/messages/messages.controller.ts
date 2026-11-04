import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, MessageReportStatus } from '@brands-creators/types';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get paginated messages for a conversation' })
  async getMessages(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Query() query: QueryMessagesDto,
  ) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    const role = req.user.role || req.user.roles?.[0];
    return this.messagesService.getMessages(conversationId, query, userId, role);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  async sendMessage(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    const role = req.user.role || req.user.roles?.[0];
    return this.messagesService.sendMessage(conversationId, dto, userId, role);
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit an existing message (author only)' })
  async editMessage(
    @Request() req: any,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.messagesService.editMessage(messageId, dto, userId);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message (soft deletion)' })
  async deleteMessage(
    @Request() req: any,
    @Param('messageId') messageId: string,
  ) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    const role = req.user.role || req.user.roles?.[0];
    return this.messagesService.deleteMessage(messageId, userId, role);
  }

  @Post('messages/:messageId/report')
  @ApiOperation({ summary: 'Report a message to admin moderation' })
  async reportMessage(
    @Request() req: any,
    @Param('messageId') messageId: string,
    @Body() dto: ReportMessageDto,
  ) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.messagesService.reportMessage(messageId, dto, userId);
  }

  @Get('admin/communication/reports')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Admin: Get list of reported messages' })
  async getReportsForAdmin(@Query('status') status?: string) {
    return this.messagesService.getReportsForAdmin(status);
  }

  @Patch('admin/communication/reports/:reportId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Admin: Resolve a message report' })
  async resolveReport(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Body('status') status: MessageReportStatus,
  ) {
    const adminUserId = req.user.id || req.user.userId || req.user.sub;
    return this.messagesService.resolveReport(reportId, status, adminUserId);
  }
}
