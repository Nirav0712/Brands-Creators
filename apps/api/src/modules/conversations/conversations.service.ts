import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { QueryConversationsDto } from './dto/query-conversation.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingService } from '../messaging/messaging.service';
import {
  ConversationType,
  ConversationStatus,
  NotificationType,
  UserRole,
} from '@brands-creators/types';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel('Application')
    private readonly applicationModel: Model<any>,
    @InjectModel('Requirement')
    private readonly requirementModel: Model<any>,
    @InjectModel('BrandProfile')
    private readonly brandProfileModel: Model<any>,
    @InjectModel('CreatorProfile')
    private readonly creatorProfileModel: Model<any>,
    @InjectModel('User')
    private readonly userModel: Model<any>,
    private readonly notificationsService: NotificationsService,
    private readonly messagingService: MessagingService,
  ) {}

  /**
   * Find or create the canonical conversation associated with an application.
   * Ensures exactly ONE unique conversation per application so both sides meet in the same thread.
   */
  async findOrCreateApplicationConversation(
    applicationId: string,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(applicationId)) {
      throw new BadRequestException('Invalid application ID');
    }

    const application = await this.applicationModel
      .findById(applicationId)
      .populate('requirementId')
      .populate('applicantId');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const requirement = application.requirementId;
    if (!requirement) {
      throw new NotFoundException('Related requirement not found');
    }

    // Resolve Brand Profile and User
    const brandProfileId = requirement.brandId?._id || requirement.brandId;
    let brandProfile = requirement.brandId?.userId ? requirement.brandId : await this.brandProfileModel.findById(brandProfileId);
    if (!brandProfile) {
      const userDoc = await this.userModel.findById(brandProfileId);
      if (userDoc) {
        brandProfile = { _id: userDoc._id, userId: userDoc._id, companyName: userDoc.fullName };
      }
    }
    if (!brandProfile) {
      throw new NotFoundException('Brand profile for this requirement not found');
    }
    const brandUserId = (brandProfile.userId?._id || brandProfile.userId)?.toString();

    // Resolve Creator Profile and User
    const applicantProfileId = application.applicantId?._id || application.applicantId;
    let creatorProfile = application.applicantId?.userId ? application.applicantId : await this.creatorProfileModel.findById(applicantProfileId);
    if (!creatorProfile) {
      const userDoc = await this.userModel.findById(applicantProfileId);
      if (userDoc) {
        creatorProfile = { _id: userDoc._id, userId: userDoc._id, fullName: userDoc.fullName };
      }
    }
    if (!creatorProfile) {
      throw new NotFoundException('Creator profile for this application not found');
    }
    const creatorUserId = (creatorProfile.userId?._id || creatorProfile.userId)?.toString();

    // Security & Ownership Validation
    const isBrandOwner = brandUserId === requestingUserId.toString();
    const isApplicant = creatorUserId === requestingUserId.toString();
    const isAdmin = requestingUserRole === UserRole.ADMIN || requestingUserRole === UserRole.SUPER_ADMIN;

    if (!isBrandOwner && !isApplicant && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to access conversations for this application',
      );
    }

    // Check if an APPLICATION conversation already exists
    let conversation = await this.conversationModel.findOne({
      applicationId: new Types.ObjectId(applicationId),
      type: ConversationType.APPLICATION,
    });

    if (!conversation) {
      // Create new canonical application conversation
      conversation = new this.conversationModel({
        type: ConversationType.APPLICATION,
        title: requirement.title,
        requirementId: requirement._id,
        applicationId: application._id,
        createdBy: new Types.ObjectId(requestingUserId),
        participants: [
          {
            userId: new Types.ObjectId(brandUserId),
            role: 'BRAND',
            joinedAt: new Date(),
            lastReadAt: isBrandOwner ? new Date() : undefined,
          },
          {
            userId: new Types.ObjectId(creatorUserId),
            role: 'CREATOR',
            joinedAt: new Date(),
            lastReadAt: isApplicant ? new Date() : undefined,
          },
        ],
        status: ConversationStatus.ACTIVE,
        messageCount: 0,
        metadata: {
          brandCompany: brandProfile.companyName,
          creatorName: creatorProfile.displayName || creatorProfile.fullName,
        },
      });

      await conversation.save();

      // Notify the counterparty about conversation initiation
      const recipientId = isBrandOwner ? creatorUserId : brandUserId;
      if (recipientId) {
        await this.notificationsService.create({
          userId: recipientId,
          type: NotificationType.NEW_MESSAGE,
          title: 'Conversation Started',
          message: `${isBrandOwner ? brandProfile.companyName : 'A creator'} opened a conversation for "${requirement.title}"`,
          link: `/inbox?conversationId=${conversation._id}`,
        });
      }
    }

    return this.findOne(conversation._id.toString(), requestingUserId, requestingUserRole);
  }

  /**
   * Create a direct or custom conversation
   */
  async create(
    dto: CreateConversationDto,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<any> {
    if (dto.applicationId) {
      return this.findOrCreateApplicationConversation(
        dto.applicationId,
        requestingUserId,
        requestingUserRole,
      );
    }

    const type = dto.type || ConversationType.DIRECT;
    const participantIds = Array.from(
      new Set([requestingUserId, ...(dto.participantUserIds || [])]),
    );

    if (participantIds.length < 2 && type === ConversationType.DIRECT) {
      throw new BadRequestException('Direct conversations require at least one other participant');
    }

    // If direct conversation between 2 users, check if one already exists
    if (type === ConversationType.DIRECT && participantIds.length === 2) {
      const existing = await this.conversationModel.findOne({
        type: ConversationType.DIRECT,
        'participants.userId': {
          $all: participantIds.map((id) => new Types.ObjectId(id)),
        },
        'participants.2': { $exists: false }, // exactly 2 participants
      });

      if (existing) {
        return this.findOne(existing._id.toString(), requestingUserId, requestingUserRole);
      }
    }

    // Build participants array
    const participants = await Promise.all(
      participantIds.map(async (uid) => {
        const u = await this.userModel.findById(uid);
        const role = u?.roles?.[0] || 'USER';
        return {
          userId: new Types.ObjectId(uid),
          role,
          joinedAt: new Date(),
          lastReadAt: uid === requestingUserId ? new Date() : undefined,
        };
      }),
    );

    const conversation = new this.conversationModel({
      type,
      title: dto.title,
      avatar: dto.avatar,
      participants,
      createdBy: new Types.ObjectId(requestingUserId),
      requirementId: dto.requirementId ? new Types.ObjectId(dto.requirementId) : undefined,
      projectId: dto.projectId,
      status: ConversationStatus.ACTIVE,
      messageCount: 0,
    });

    await conversation.save();

    return this.findOne(conversation._id.toString(), requestingUserId, requestingUserRole);
  }

  /**
   * Find all conversations for a user with unread counts and relations
   */
  async findAllForUser(userId: string, query: QueryConversationsDto): Promise<any> {
    const userObjId = new Types.ObjectId(userId);
    const filter: Record<string, any> = {
      'participants.userId': userObjId,
    };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.status === 'ARCHIVED') {
      filter['participants'] = {
        $elemMatch: { userId: userObjId, archived: true },
      };
    } else if (query.status === 'DIRECT' || query.status === 'APPLICATION' || query.status === 'PROJECT') {
      filter.type = query.status;
      filter['participants'] = {
        $elemMatch: { userId: userObjId, archived: { $ne: true } },
      };
    } else if (query.status !== 'ALL') {
      // Default: exclude archived
      filter['participants'] = {
        $elemMatch: { userId: userObjId, archived: { $ne: true } },
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 30;
    const skip = (page - 1) * limit;

    const total = await this.conversationModel.countDocuments(filter);

    const conversations = await this.conversationModel
      .find(filter)
      .populate({
        path: 'participants.userId',
        select: 'fullName email avatarUrl username roles brandProfileId creatorProfileId',
      })
      .populate({
        path: 'requirementId',
        select: 'title budget slug status location',
      })
      .populate({
        path: 'applicationId',
        select: 'status offeredPrice currency createdAt matchScore',
      })
      .populate({
        path: 'lastMessageId',
        select: 'text messageType senderId createdAt status',
      })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Compute unread counts and format conversation items
    const items = await Promise.all(
      conversations.map(async (conv: any) => {
        const participant = conv.participants.find(
          (p: any) => (p.userId?._id || p.userId)?.toString() === userId.toString(),
        );

        const lastRead = participant?.lastReadAt ? new Date(participant.lastReadAt) : new Date(0);

        const unreadCount = await this.messageModel.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: userObjId },
          createdAt: { $gt: lastRead },
          status: { $ne: 'DELETED' },
        });

        // Resolve counterparty user
        const otherParticipant = conv.participants.find(
          (p: any) => (p.userId?._id || p.userId)?.toString() !== userId.toString(),
        );

        return {
          ...conv,
          unreadCount,
          isArchived: !!participant?.archived,
          isMuted: !!participant?.muted,
          otherParticipant: otherParticipant?.userId || null,
        };
      }),
    );

    // Apply client filter for UNREAD if requested
    let finalItems = items;
    if (query.status === 'UNREAD') {
      finalItems = items.filter((item) => item.unreadCount > 0);
    }

    // Apply search filter if query.search provided
    if (query.search) {
      const s = query.search.toLowerCase();
      finalItems = finalItems.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(s);
        const reqMatch = item.requirementId?.title?.toLowerCase().includes(s);
        const otherNameMatch = item.otherParticipant?.fullName?.toLowerCase().includes(s);
        const lastMsgMatch = item.lastMessagePreview?.toLowerCase().includes(s);
        return titleMatch || reqMatch || otherNameMatch || lastMsgMatch;
      });
    }

    const unreadTotal = items.reduce((acc, curr) => acc + curr.unreadCount, 0);

    return {
      items: finalItems,
      total,
      unreadTotal,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find single conversation by ID with membership authorization
   */
  async findOne(id: string, userId: string, userRole: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid conversation ID');
    }

    const conv: any = await this.conversationModel
      .findById(id)
      .populate({
        path: 'participants.userId',
        select: 'fullName email avatarUrl username roles brandProfileId creatorProfileId',
      })
      .populate({
        path: 'requirementId',
        select: 'title budget slug status location categoryId',
      })
      .populate({
        path: 'applicationId',
        select: 'status offeredPrice currency createdAt matchScore proposal',
      })
      .populate({
        path: 'lastMessageId',
      })
      .lean();

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conv.participants.some(
      (p: any) => (p.userId?._id || p.userId)?.toString() === userId.toString(),
    );
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    const participant = conv.participants.find(
      (p: any) => (p.userId?._id || p.userId)?.toString() === userId.toString(),
    );

    const lastRead = participant?.lastReadAt ? new Date(participant.lastReadAt) : new Date(0);

    const unreadCount = await this.messageModel.countDocuments({
      conversationId: conv._id,
      senderId: { $ne: new Types.ObjectId(userId) },
      createdAt: { $gt: lastRead },
      status: { $ne: 'DELETED' },
    });

    const otherParticipant = conv.participants.find(
      (p: any) => (p.userId?._id || p.userId)?.toString() !== userId.toString(),
    );

    return {
      ...conv,
      unreadCount,
      isArchived: !!participant?.archived,
      isMuted: !!participant?.muted,
      otherParticipant: otherParticipant?.userId || null,
    };
  }

  /**
   * Mark conversation as read for the current user
   */
  async markAsRead(id: string, userId: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid conversation ID');
    }

    const userObjId = new Types.ObjectId(userId);
    const now = new Date();

    const conv = await this.conversationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        'participants.userId': userObjId,
      },
      {
        $set: { 'participants.$.lastReadAt': now },
      },
      { new: true },
    );

    if (!conv) {
      throw new NotFoundException('Conversation not found or you are not a participant');
    }

    // Update message read receipts for incoming messages
    await this.messageModel.updateMany(
      {
        conversationId: conv._id,
        senderId: { $ne: userObjId },
        'readBy.userId': { $ne: userObjId },
      },
      {
        $push: { readBy: { userId: userObjId, readAt: now } },
      },
    );

    this.messagingService.notifyMessageRead(id, {
      conversationId: id,
      userId,
      readAt: now,
    });

    return { success: true, conversationId: id, readAt: now };
  }

  /**
   * Update conversation participant preferences (mute, archive)
   */
  async update(id: string, dto: UpdateConversationDto, userId: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid conversation ID');
    }

    const userObjId = new Types.ObjectId(userId);
    const updateOps: Record<string, any> = {};

    if (dto.title) updateOps.title = dto.title;
    if (dto.avatar) updateOps.avatar = dto.avatar;
    if (dto.status) updateOps.status = dto.status;

    if (dto.muted !== undefined) {
      updateOps['participants.$.muted'] = dto.muted;
    }
    if (dto.archived !== undefined) {
      updateOps['participants.$.archived'] = dto.archived;
    }

    const updated = await this.conversationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        'participants.userId': userObjId,
      },
      { $set: updateOps },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Conversation not found or permission denied');
    }

    return this.findOne(id, userId, 'USER');
  }

  /**
   * Get aggregate unread count across all conversations for the user
   */
  async getUnreadSummary(userId: string): Promise<any> {
    const userObjId = new Types.ObjectId(userId);
    const conversations = await this.conversationModel.find({
      'participants.userId': userObjId,
      status: { $ne: ConversationStatus.ARCHIVED },
    });

    let totalUnread = 0;
    const unreadByConversation: Record<string, number> = {};

    for (const conv of conversations) {
      const participant = conv.participants.find(
        (p) => p.userId.toString() === userId.toString(),
      );
      const lastRead = participant?.lastReadAt ? new Date(participant.lastReadAt) : new Date(0);

      const count = await this.messageModel.countDocuments({
        conversationId: conv._id,
        senderId: { $ne: userObjId },
        createdAt: { $gt: lastRead },
        status: { $ne: 'DELETED' },
      });

      if (count > 0) {
        unreadByConversation[conv._id.toString()] = count;
        totalUnread += count;
      }
    }

    return { totalUnread, unreadByConversation };
  }
}
