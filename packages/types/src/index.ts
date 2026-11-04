/**
 * BRANDS & CREATORS — UNIVERSAL TYPE DEFINITIONS
 * Phase 02: Dynamic Categories, Advanced Profiles & Discovery
 */

// ==========================================
// 1. Roles & Permissions
// ==========================================
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  BRAND = 'BRAND',
  CREATOR = 'CREATOR',
  PRODUCTION_TEAM = 'PRODUCTION_TEAM',
  AGENCY = 'AGENCY',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum ProfileVisibility {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAUSED = 'PAUSED',
  SUSPENDED = 'SUSPENDED',
}

export enum PricingModel {
  PER_HOUR = 'PER_HOUR',
  PER_DAY = 'PER_DAY',
  PER_SHOOT = 'PER_SHOOT',
  PER_PROJECT = 'PER_PROJECT',
  MONTHLY = 'MONTHLY',
  CUSTOM_QUOTE = 'CUSTOM_QUOTE',
}

export enum ExperienceLevel {
  ENTRY = 'ENTRY',
  JUNIOR = 'JUNIOR',
  MID_LEVEL = 'MID_LEVEL',
  SENIOR = 'SENIOR',
  LEAD_EXPERT = 'LEAD_EXPERT',
}

export interface IUser {
  _id: string;
  email: string;
  username: string;
  fullName: string;
  roles: UserRole[];
  status: UserStatus;
  avatarUrl?: string;
  phone?: string;
  isEmailVerified: boolean;
  creatorProfileId?: string;
  brandProfileId?: string;
  productionTeamProfileId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ==========================================
// 2. Dynamic Categories & Taxonomies
// ==========================================
export enum CategoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum CategoryType {
  ALL = 'ALL',
  CREATOR = 'CREATOR',
  BRAND = 'BRAND',
  PRODUCTION_TEAM = 'PRODUCTION_TEAM',
  TALENT = 'TALENT',
  AGENCY = 'AGENCY',
}

export interface ISubCategory {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  iconName?: string;
  isActive: boolean;
  order: number;
  specializations?: string[];
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  iconName?: string;
  parentId?: string;
  level: number;
  type: CategoryType;
  status: CategoryStatus;
  featured: boolean;
  sortOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  subcategories: ISubCategory[];
  children?: ICategory[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ==========================================
// 3. Profiles (Creator, Brand, Production Team)
// ==========================================
export enum AvailabilityStatus {
  AVAILABLE_NOW = 'AVAILABLE_NOW',
  BUSY = 'BUSY',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
}

export enum ServiceMode {
  REMOTE = 'REMOTE',
  ON_SITE = 'ON_SITE',
  HYBRID = 'HYBRID',
}

export type PortfolioType = 'IMAGE' | 'VIDEO' | 'REEL' | 'CASE_STUDY' | 'PROJECT';

export interface IPortfolioItem {
  _id?: string;
  title: string;
  description?: string;
  mediaType: PortfolioType;
  mediaUrl: string;
  coverImage?: string;
  images?: string[];
  videoUrl?: string;
  externalVideoUrl?: string;
  projectUrl?: string;
  category?: string;
  clientBrand?: string;
  projectDate?: string;
  deliverables?: string[];
  servicesProvided?: string[];
  skillsUsed?: string[];
  tags?: string[];
  isFeatured?: boolean;
  sortOrder?: number;
  metrics?: {
    views?: number;
    likes?: number;
    reach?: number;
    engagement?: number;
  };
}

export interface IServiceOffer {
  _id?: string;
  title: string;
  description?: string;
  startingPrice: number;
  currency: string;
  pricingModel?: PricingModel;
  deliveryDays?: number;
  features?: string[];
}

export interface IBrandCollaboration {
  _id?: string;
  brandName: string;
  brandLogo?: string;
  campaignName: string;
  role: string;
  services: string[];
  description?: string;
  date?: string;
  mediaUrl?: string;
  externalUrl?: string;
}

export interface IProfileCompletionItem {
  key: string;
  label: string;
  completed: boolean;
  weight: number;
  tip?: string;
}

export interface IProfileCompletionResult {
  score: number;
  isComplete: boolean;
  items: IProfileCompletionItem[];
  recommendations: string[];
}

export interface ICreatorProfile {
  _id: string;
  userId: string;
  user?: IUser;
  slug: string;
  headline: string;
  bio: string;
  about?: string;
  professionalType?: string;
  primaryCategoryId: string;
  primaryCategory?: ICategory;
  additionalCategoryIds?: string[];
  subcategoryIds: string[];
  skills: string[];
  location: {
    city: string;
    state?: string;
    country: string;
  };
  serviceAreas: string[];
  languages: string[];
  pricingModel: PricingModel;
  startingPrice: number;
  isCustomQuoteOnly: boolean;
  currency: string;
  serviceMode: ServiceMode;
  availability: AvailabilityStatus;
  experienceLevel: ExperienceLevel;
  experienceYears: number;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | Date;
  visibilityStatus: ProfileVisibility;
  completionPercentage: number;
  completionChecklist?: IProfileCompletionItem[];
  averageRating: number;
  reviewCount: number;
  portfolio: IPortfolioItem[];
  services: IServiceOffer[];
  brandCollaborations: IBrandCollaboration[];
  coverImageUrl?: string;
  featured: boolean;
  totalFollowers?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IBrandCampaign {
  _id?: string;
  title: string;
  description?: string;
  year?: number;
  deliverables?: string[];
  mediaUrl?: string;
  budgetRange?: string;
}

export interface IBrandProfile {
  _id: string;
  userId: string;
  user?: IUser;
  companyName: string;
  slug: string;
  tagline?: string;
  description: string;
  industry: string;
  companySize?: string;
  foundedYear?: number;
  logoUrl?: string;
  coverImageUrl?: string;
  websiteUrl?: string;
  location: {
    city: string;
    state?: string;
    country: string;
  };
  serviceAreas?: string[];
  contactEmail?: string;
  contactPhone?: string;
  verificationStatus: VerificationStatus;
  visibilityStatus: ProfileVisibility;
  teamSize?: number;
  activeRequirementsCount?: number;
  previousCampaigns?: IBrandCampaign[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IProductionTeamProfile {
  _id: string;
  userId: string;
  user?: IUser;
  studioName: string;
  slug: string;
  tagline?: string;
  description: string;
  teamSize: number;
  foundedYear?: number;
  equipmentRoster: string[];
  specialties: string[];
  services: IServiceOffer[];
  location: {
    city: string;
    state?: string;
    country: string;
  };
  serviceAreas: string[];
  startingDayRate: number;
  pricingModel: PricingModel;
  currency: string;
  portfolio: IPortfolioItem[];
  previousClients?: Array<{ name: string; logoUrl?: string; projectTitle?: string }>;
  availability: AvailabilityStatus;
  verificationStatus: VerificationStatus;
  visibilityStatus: ProfileVisibility;
  logoUrl?: string;
  coverImageUrl?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ==========================================
// 4. Social Accounts & Metrics
// ==========================================
export enum SocialPlatform {
  INSTAGRAM = 'INSTAGRAM',
  YOUTUBE = 'YOUTUBE',
  LINKEDIN = 'LINKEDIN',
  TIKTOK = 'TIKTOK',
  X = 'X',
  FACEBOOK = 'FACEBOOK',
  WEBSITE = 'WEBSITE',
}

export interface ISocialAccountMetrics {
  followers?: number;
  subscribers?: number;
  postsCount?: number;
  following?: number;
  engagementRate?: number;
  bio?: string;
  profileImage?: string;
  lastSyncedAt?: string | Date;
}

export interface ISocialAccount {
  _id: string;
  userId: string;
  platform: SocialPlatform;
  profileUrl: string;
  handle: string;
  providerAccountId?: string;
  isConnected: boolean;
  verificationStatus: VerificationStatus;
  metrics: ISocialAccountMetrics;
  lastSyncedAt?: string | Date;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

// ==========================================
// 5. Requirements & Applications (Marketplace)
// ==========================================
export enum RequirementStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum BudgetType {
  FIXED = 'FIXED',
  RANGE = 'RANGE',
  NEGOTIABLE = 'NEGOTIABLE',
  CUSTOM_QUOTE = 'CUSTOM_QUOTE',
}

export interface IRequirementAttachment {
  url: string;
  name: string;
  fileType?: string;
  sizeBytes?: number;
}

export interface IRequirement {
  _id: string;
  brandId: string;
  brandProfile?: IBrandProfile;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  category?: ICategory;
  subcategoryId?: string;
  subcategoryIds: string[];
  location: {
    city?: string;
    state?: string;
    country: string;
    isRemote: boolean;
  };
  serviceLocations?: string[];
  remoteAllowed: boolean;
  budgetType: BudgetType;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  applicationDeadline: string | Date;
  startDate?: string | Date;
  endDate?: string | Date;
  deliverables: string[];
  requiredSkills: string[];
  preferredExperience?: ExperienceLevel | string;
  requiredLanguages?: string[];
  targetPlatforms?: string[];
  targetIndustry?: string;
  genderPreference?: string;
  attachments?: IRequirementAttachment[];
  categorySpecificFields?: Record<string, any>;
  status: RequirementStatus;
  visibility: ProfileVisibility | 'PUBLIC' | 'PRIVATE';
  featured: boolean;
  applicationCount: number;
  professionalsRequired: number;
  publishedAt?: string | Date;
  closedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export enum ApplicationStatus {
  SUBMITTED = 'SUBMITTED',
  VIEWED = 'VIEWED',
  SHORTLISTED = 'SHORTLISTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface IApplicationPortfolioSelection {
  title: string;
  mediaUrl: string;
  mediaType: string;
  coverImage?: string;
  clientBrand?: string;
}

export interface IApplication {
  _id: string;
  requirementId: string;
  requirement?: IRequirement;
  applicantId: string;
  applicantUser?: IUser;
  creatorProfileId?: string;
  creatorProfile?: ICreatorProfile;
  proposal: string;
  proposalText?: string;
  offeredPrice: number;
  currency: string;
  availability: string;
  estimatedDelivery: string | number;
  estimatedDeliveryDays?: number;
  selectedPortfolioItems?: IApplicationPortfolioSelection[];
  portfolioReferenceUrls?: string[];
  additionalMessage?: string;
  status: ApplicationStatus;
  matchScore?: number;
  brandNotes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ==========================================
// 6. Matching, Shortlists, Reviews & Notifications
// ==========================================
export interface IMatchingBreakdown {
  categoryMatch: number;
  locationMatch: number;
  skillsMatch: number;
  platformMatch: number;
  availabilityMatch: number;
}

export interface IMatchingResult {
  score: number;
  breakdown: IMatchingBreakdown;
  reasons: string[];
}

export interface IShortlist {
  _id: string;
  brandId: string;
  requirementId?: string;
  name: string;
  description?: string;
  creatorProfileIds: string[];
  creatorProfiles?: ICreatorProfile[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IReview {
  _id: string;
  authorUserId: string;
  author?: IUser;
  targetCreatorProfileId: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  projectName?: string;
  isVerifiedClient: boolean;
  createdAt: string | Date;
}

export enum NotificationType {
  REQUIREMENT_PUBLISHED = 'REQUIREMENT_PUBLISHED',
  APPLICATION_RECEIVED = 'APPLICATION_RECEIVED',
  APPLICATION_VIEWED = 'APPLICATION_VIEWED',
  APPLICATION_SHORTLISTED = 'APPLICATION_SHORTLISTED',
  APPLICATION_ACCEPTED = 'APPLICATION_ACCEPTED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
  REQUIREMENT_MATCH = 'REQUIREMENT_MATCH',
  REQUIREMENT_DEADLINE_APPROACHING = 'REQUIREMENT_DEADLINE_APPROACHING',
  REQUIREMENT_CLOSED = 'REQUIREMENT_CLOSED',
  NEW_MESSAGE = 'NEW_MESSAGE',
  NEW_REVIEW = 'NEW_REVIEW',
  PROFILE_VERIFIED = 'PROFILE_VERIFIED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_STARTED = 'PROJECT_STARTED',
  PROJECT_COMPLETED = 'PROJECT_COMPLETED',
  PROJECT_CANCELLED = 'PROJECT_CANCELLED',
  MILESTONE_ASSIGNED = 'MILESTONE_ASSIGNED',
  MILESTONE_SUBMITTED = 'MILESTONE_SUBMITTED',
  DELIVERABLE_SUBMITTED = 'DELIVERABLE_SUBMITTED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  DELIVERABLE_APPROVED = 'DELIVERABLE_APPROVED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  PAYMENT_ORDER_CREATED = 'PAYMENT_ORDER_CREATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  PAYOUT_PENDING = 'PAYOUT_PENDING',
  PAYOUT_COMPLETED = 'PAYOUT_COMPLETED',
  PAYOUT_FAILED = 'PAYOUT_FAILED',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  REVIEW_REPORTED = 'REVIEW_REPORTED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  APPLICATION_WITHDRAWN = 'APPLICATION_WITHDRAWN',
  TASK_UPDATED = 'TASK_UPDATED',
  TEAM_INVITATION = 'TEAM_INVITATION',
  PROFILE_REJECTED = 'PROFILE_REJECTED',
  AI_MATCH_ALERT = 'AI_MATCH_ALERT',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export interface INotification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: string | Date;
  channels?: NotificationChannel[];
  entityType?: string;
  entityId?: string;
  deduplicationKey?: string;
  metadata?: Record<string, any>;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface INotificationPreferences {
  _id?: string;
  userId: string;
  inApp: {
    applications: boolean;
    projects: boolean;
    messages: boolean;
    payments: boolean;
    reviews: boolean;
    marketing: boolean;
  };
  email: {
    applications: boolean;
    projects: boolean;
    messages: boolean;
    payments: boolean;
    reviews: boolean;
    marketing: boolean;
  };
  digestFrequency?: 'INSTANT' | 'DAILY' | 'WEEKLY' | 'NONE';
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export enum EmailDeliveryStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
}

export interface IEmailDeliveryJob {
  _id: string;
  notificationId?: string;
  recipientId: string;
  recipientEmail: string;
  recipientName?: string;
  template: string;
  subject: string;
  html?: string;
  text?: string;
  status: EmailDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string | Date;
  provider: string;
  providerMessageId?: string;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: string | Date;
  updatedAt?: string | Date;
  processedAt?: string | Date;
}

// ==========================================
// 7. Audit Logs & System Settings
// ==========================================
export enum AuditAction {
  USER_CREATED = 'USER_CREATED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  PROFILE_VERIFIED = 'PROFILE_VERIFIED',
  PROFILE_SUSPENDED = 'PROFILE_SUSPENDED',
  PROFILE_RESTORED = 'PROFILE_RESTORED',
  PROFILE_REJECTED = 'PROFILE_REJECTED',
  PROFILE_FEATURED = 'PROFILE_FEATURED',
  CATEGORY_CREATED = 'CATEGORY_CREATED',
  CATEGORY_UPDATED = 'CATEGORY_UPDATED',
  CATEGORY_ARCHIVED = 'CATEGORY_ARCHIVED',
  REQUIREMENT_MODERATED = 'REQUIREMENT_MODERATED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  NOTIFICATION_RETRY = 'NOTIFICATION_RETRY',
  ANNOUNCEMENT_BROADCAST = 'ANNOUNCEMENT_BROADCAST',
  QUEUE_PROCESSED = 'QUEUE_PROCESSED',
  TEAM_MEMBER_INVITED = 'TEAM_MEMBER_INVITED',
  TEAM_MEMBER_REMOVED = 'TEAM_MEMBER_REMOVED',
  APPLICATION_BULK_MODERATED = 'APPLICATION_BULK_MODERATED',
  AUDIT_LOG_EXPORTED = 'AUDIT_LOG_EXPORTED',
}

export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

export interface IAuditLog {
  _id: string;
  adminUserId: string;
  adminName: string;
  action: AuditAction;
  targetEntity: string;
  targetId: string;
  details: string;
  ipAddress?: string;
  createdAt: string | Date;
}

// ==========================================
// 9. Phase 04: Conversations & Messaging Infrastructure
// ==========================================
export enum ConversationType {
  DIRECT = 'DIRECT',
  APPLICATION = 'APPLICATION',
  PROJECT = 'PROJECT',
  GROUP = 'GROUP',
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED',
}

export interface IConversationParticipant {
  userId: string;
  role: string;
  joinedAt: string | Date;
  lastReadAt?: string | Date;
  muted?: boolean;
  archived?: boolean;
  user?: Partial<IUser>;
}

export interface IConversation {
  _id: string;
  type: ConversationType;
  title?: string;
  avatar?: string;
  participants: IConversationParticipant[];
  createdBy: string;
  requirementId?: string;
  applicationId?: string;
  projectId?: string;
  lastMessageId?: string;
  lastMessageAt?: string | Date;
  lastMessagePreview?: string;
  messageCount: number;
  status: ConversationStatus;
  metadata?: Record<string, any>;
  createdAt: string | Date;
  updatedAt: string | Date;
  relatedRequirement?: Partial<IRequirement>;
  relatedApplication?: Partial<IApplication>;
}

export interface IConversationListItem extends IConversation {
  unreadCount: number;
}

export interface IUnreadCount {
  totalUnread: number;
  unreadByConversation: Record<string, number>;
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
  LINK = 'LINK',
  SYSTEM = 'SYSTEM',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  VOICE_NOTE = 'VOICE_NOTE',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  DELETED = 'DELETED',
  EDITED = 'EDITED',
}

export interface IMessageAttachment {
  url: string;
  publicId?: string;
  type: 'image' | 'video' | 'file' | 'document';
  mimeType: string;
  fileName: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  sender?: Partial<IUser>;
  messageType: MessageType;
  text: string;
  attachments?: IMessageAttachment[];
  replyToMessageId?: string;
  replyToMessage?: Partial<IMessage>;
  metadata?: Record<string, any>;
  status: MessageStatus;
  readBy?: Array<{ userId: string; readAt: string | Date }>;
  createdAt: string | Date;
  updatedAt: string | Date;
  editedAt?: string | Date;
  deletedAt?: string | Date;
  deletedBy?: string;
}

export enum MessageReportReason {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  FRAUD = 'FRAUD',
  INAPPROPRIATE = 'INAPPROPRIATE',
  SCAM = 'SCAM',
  OTHER = 'OTHER',
}

export enum MessageReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
  RESOLVED = 'RESOLVED',
}

export interface IMessageReport {
  _id: string;
  messageId: string;
  conversationId: string;
  reportedBy: string;
  reporter?: Partial<IUser>;
  reason: MessageReportReason;
  description?: string;
  status: MessageReportStatus;
  createdAt: string | Date;
  resolvedAt?: string | Date;
  resolvedBy?: string;
}

// ==========================================
// 10. Phase 05: Projects & Collaboration Workspace
// ==========================================
export enum ProjectStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  IN_REVIEW = 'IN_REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

export enum ProjectRole {
  OWNER = 'OWNER',
  CLIENT = 'CLIENT',
  PROFESSIONAL = 'PROFESSIONAL',
  MANAGER = 'MANAGER',
  COLLABORATOR = 'COLLABORATOR',
}

export interface IProjectParticipant {
  userId: string;
  user?: Partial<IUser>;
  role: ProjectRole;
  joinedAt: string | Date;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface IProject {
  _id: string;
  projectNumber: string;
  title: string;
  slug: string;
  description?: string;
  status: ProjectStatus;
  brandId: string;
  brand?: Partial<IUser>;
  professionalId: string;
  professional?: Partial<IUser>;
  professionalType: 'CREATOR' | 'PRODUCTION_TEAM' | 'AGENCY' | 'USER';
  requirementId: string;
  requirement?: any;
  applicationId: string;
  application?: any;
  conversationId?: string;
  approvedBudget: number;
  currency: string;
  startDate?: string | Date;
  endDate?: string | Date;
  actualStartDate?: string | Date;
  actualEndDate?: string | Date;
  progress: number;
  participants: IProjectParticipant[];
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  completedAt?: string | Date;
  cancelledAt?: string | Date;
  cancellationReason?: string;
  holdReason?: string;
  completionNotes?: string;
  metadata?: Record<string, any>;
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IMilestone {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  order: number;
  status: MilestoneStatus;
  dueDate?: string | Date;
  progress: number;
  completedAt?: string | Date;
  completedBy?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export enum DeliverableType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  DESIGN = 'DESIGN',
  LINK = 'LINK',
  OTHER = 'OTHER',
}

export enum DeliverableStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface IDeliverableFile {
  url: string;
  publicId?: string;
  type: string;
  mimeType: string;
  fileName: string;
  size: number;
}

export interface IDeliverableVersion {
  version: number;
  files: IDeliverableFile[];
  links?: string[];
  description?: string;
  notes?: string;
  submittedBy: string;
  submittedAt: string | Date;
  status: DeliverableStatus;
  feedback?: string;
  reviewedBy?: string;
  reviewedAt?: string | Date;
}

export interface IDeliverable {
  _id: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  type: DeliverableType;
  status: DeliverableStatus;
  submittedBy?: string;
  submissionVersion: number;
  files?: IDeliverableFile[];
  links?: string[];
  notes?: string;
  submittedAt?: string | Date;
  reviewedAt?: string | Date;
  reviewedBy?: string;
  feedback?: string;
  versions: IDeliverableVersion[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
}

export interface IProjectTask {
  _id: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedUser?: Partial<IUser>;
  createdBy: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | Date;
  completedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IProjectFile {
  _id: string;
  projectId: string;
  milestoneId?: string;
  uploadedBy: string;
  uploader?: Partial<IUser>;
  fileName: string;
  url: string;
  publicId?: string;
  mimeType: string;
  size: number;
  version?: number;
  description?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export enum ProjectActivityType {
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_STARTED = 'PROJECT_STARTED',
  PROJECT_STATUS_CHANGED = 'PROJECT_STATUS_CHANGED',
  MILESTONE_CREATED = 'MILESTONE_CREATED',
  MILESTONE_UPDATED = 'MILESTONE_UPDATED',
  MILESTONE_SUBMITTED = 'MILESTONE_SUBMITTED',
  DELIVERABLE_SUBMITTED = 'DELIVERABLE_SUBMITTED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  DELIVERABLE_APPROVED = 'DELIVERABLE_APPROVED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  FILE_UPLOADED = 'FILE_UPLOADED',
  PROJECT_COMPLETED = 'PROJECT_COMPLETED',
  PROJECT_CANCELLED = 'PROJECT_CANCELLED',
  PROJECT_ON_HOLD = 'PROJECT_ON_HOLD',
}

export interface IProjectActivity {
  _id: string;
  projectId: string;
  actorId: string;
  actor?: Partial<IUser>;
  actorRole?: string;
  type: ProjectActivityType;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string | Date;
}

export interface IProjectProgress {
  totalMilestones: number;
  completedMilestones: number;
  totalDeliverables: number;
  approvedDeliverables: number;
  progressPercentage: number;
}

// ==========================================
// 11. API Common Types
// ==========================================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  error?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

// ==========================================
// 12. Phase 06: Payments, Transactions, Reviews & Reputation
// ==========================================
export enum PaymentProviderType {
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
  MANUAL = 'MANUAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUND_PENDING = 'REFUND_PENDING',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}

export enum PaymentType {
  PROJECT_PAYMENT = 'PROJECT_PAYMENT',
  MILESTONE_PAYMENT = 'MILESTONE_PAYMENT',
  FINAL_PAYMENT = 'FINAL_PAYMENT',
  REFUND = 'REFUND',
}

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  PLATFORM_FEE = 'PLATFORM_FEE',
  PROFESSIONAL_PAYOUT = 'PROFESSIONAL_PAYOUT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum TransactionDirection {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  VOIDED = 'VOIDED',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ReviewStatus {
  PUBLISHED = 'PUBLISHED',
  HIDDEN = 'HIDDEN',
  FLAGGED = 'FLAGGED',
  REMOVED = 'REMOVED',
}

export enum ReviewReportReason {
  FAKE = 'FAKE',
  ABUSE = 'ABUSE',
  SPAM = 'SPAM',
  CONFLICT_OF_INTEREST = 'CONFLICT_OF_INTEREST',
  INAPPROPRIATE = 'INAPPROPRIATE',
  OTHER = 'OTHER',
}

export enum ReviewReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export interface IPayment {
  _id: string;
  paymentNumber: string;
  projectId: string;
  applicationId?: string;
  requirementId?: string;
  milestoneId?: string;
  brandId: string;
  professionalId: string;
  amount: number;
  currency: string;
  platformFeePercentage: number;
  platformFee: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  professionalAmount: number;
  provider: PaymentProviderType;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerSignature?: string;
  status: PaymentStatus;
  paymentType: PaymentType;
  transactionId?: string;
  payoutId?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string | Date;
  paidAt?: string | Date;
  failedAt?: string | Date;
  failureReason?: string;
  createdBy: string;
  metadata?: Record<string, any>;
  createdAt: string | Date;
  updatedAt: string | Date;
  project?: Partial<IProject>;
  brand?: Partial<IUser>;
  professional?: Partial<IUser>;
}

export interface IPaymentOrder {
  paymentId: string;
  paymentNumber: string;
  provider: PaymentProviderType;
  providerOrderId?: string;
  amount: number;
  currency: string;
  keyId?: string;
  userEmail?: string;
  userName?: string;
  projectTitle?: string;
}

export interface ITransaction {
  _id: string;
  transactionNumber: string;
  paymentId?: string;
  projectId: string;
  brandId: string;
  professionalId: string;
  type: TransactionType;
  direction: TransactionDirection;
  amount: number;
  currency: string;
  status: TransactionStatus;
  provider: PaymentProviderType;
  providerTransactionId?: string;
  reference?: string;
  metadata?: Record<string, any>;
  capturedAt?: string | Date;
  refundedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  project?: Partial<IProject>;
}

export interface IPayout {
  _id: string;
  payoutNumber: string;
  projectId: string;
  paymentId: string;
  professionalId: string;
  amount: number;
  currency: string;
  platformFee: number;
  status: PayoutStatus;
  provider: string;
  providerPayoutId?: string;
  scheduledAt?: string | Date;
  processedAt?: string | Date;
  failureReason?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  project?: Partial<IProject>;
  professional?: Partial<IUser>;
}

export interface IPaymentWebhook {
  _id: string;
  eventId: string;
  provider: string;
  eventType: string;
  paymentId?: string;
  payloadHash?: string;
  processed: boolean;
  processedAt?: string | Date;
  createdAt: string | Date;
}

export interface IRefund {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  processedAt: string | Date;
}

export interface IReviewCriteria {
  quality?: number;
  communication?: number;
  timeliness?: number;
  professionalism?: number;
  value?: number;
}

export interface IProjectReview {
  _id: string;
  projectId: string;
  reviewerId: string;
  revieweeId: string;
  reviewerRole: UserRole;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  criteria?: IReviewCriteria;
  verifiedProject: boolean;
  status: ReviewStatus;
  responseBy?: string;
  responseText?: string;
  responseAt?: string | Date;
  editedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  reviewer?: Partial<IUser>;
  reviewee?: Partial<IUser>;
  project?: Partial<IProject>;
}

export interface IReviewReport {
  _id: string;
  reviewId: string;
  reportedBy: string;
  reason: ReviewReportReason;
  description?: string;
  status: ReviewReportStatus;
  resolvedBy?: string;
  resolvedAt?: string | Date;
  createdAt: string | Date;
  review?: Partial<IProjectReview>;
  reporter?: Partial<IUser>;
}

export interface IReputationSummary {
  userId: string;
  averageRating: number;
  totalReviews: number;
  verifiedReviews: number;
  completedProjects: number;
  criteriaBreakdown: {
    quality: number;
    communication: number;
    timeliness: number;
    professionalism: number;
    value: number;
  };
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// ==========================================
// 10. Phase 08: Enterprise CRM, Brand Teams & AI Intelligence
// ==========================================
export enum BrandTeamRole {
  OWNER = 'OWNER',
  CAMPAIGN_MANAGER = 'CAMPAIGN_MANAGER',
  FINANCE_REVIEWER = 'FINANCE_REVIEWER',
  COLLABORATOR = 'COLLABORATOR',
}

export interface IBrandTeamMember {
  _id?: string;
  userId?: string;
  email: string;
  fullName: string;
  role: BrandTeamRole;
  status: 'INVITED' | 'ACTIVE' | 'REVOKED';
  invitedAt: string | Date;
  joinedAt?: string | Date;
  inviteToken?: string;
  inviteExpiresAt?: string | Date;
}

export interface IBrandTeamInvitationPreview {
  valid: boolean;
  companyName: string;
  logoUrl?: string;
  email: string;
  fullName: string;
  role: BrandTeamRole;
  isExpired: boolean;
  isRevoked: boolean;
  isAccepted: boolean;
}

export interface IBrandAnalytics {
  activeRequirements: number;
  totalProposalsReceived: number;
  shortlistedCount: number;
  hiredCount: number;
  completedProjects: number;
  totalSpend: number;
  averageProposalRate: number;
  categoryBreakdown: { category: string; count: number }[];
  monthlySpendTrend: { month: string; amount: number }[];
}

export interface IAiSemanticMatchResult {
  overallScore: number; // 0-100
  categoryFit: number;
  skillsAlignment: number;
  rateCompatibility: number;
  portfolioRelevance: number;
  insights: {
    strengths: string[];
    considerations: string[];
    recommendationSummary: string;
  };
}

export interface IAiProposalPitchResult {
  headline: string;
  hook: string;
  pitchBody: string;
  highlightedSkills: string[];
  suggestedTurnaroundDays: number;
  suggestedBid: number;
  suggestedMilestones: { title: string; percentage: number; description: string }[];
}

export interface IAiBriefOptimizationResult {
  optimizedTitle: string;
  recommendedCategory: string;
  suggestedSkills: string[];
  suggestedBudgetRange: { min: number; max: number; currency: string };
  recommendedDeliverables: string[];
  scopeClarityScore: number; // 0-100
  actionableSuggestions: string[];
}

// ==========================================
// 14. Phase 21: Subscriptions, Token Wallets & Economy
// ==========================================
export enum SubscriptionPlanDuration {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  LIFETIME = 'LIFETIME',
  CUSTOM = 'CUSTOM',
}

export enum SubscriptionStatus {
  INACTIVE = 'INACTIVE',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  REVOKED = 'REVOKED',
}

export interface ISubscriptionPlan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number; // in INR
  currency: string;
  duration: SubscriptionPlanDuration;
  durationDays: number;
  includedTokens: number;
  entitlements: string[];
  allowedRoles: UserRole[];
  isFree: boolean;
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IUserSubscription {
  _id: string;
  userId: string;
  planId: string | ISubscriptionPlan;
  status: SubscriptionStatus;
  startsAt: string | Date;
  expiresAt?: string | Date;
  isAutoRenew: boolean;
  grantedTokensCount: number;
  paymentRequestId?: string;
  cancelledAt?: string | Date;
  metadata?: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export enum TokenLedgerType {
  FREE_ALLOCATION = 'FREE_ALLOCATION',
  SUBSCRIPTION_GRANT = 'SUBSCRIPTION_GRANT',
  PURCHASE = 'PURCHASE',
  ADMIN_BONUS = 'ADMIN_BONUS',
  PROMOTIONAL = 'PROMOTIONAL',
  SPEND = 'SPEND',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum TokenLedgerDirection {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export interface ITokenWallet {
  _id: string;
  userId: string;
  balance: number;
  totalReceived: number;
  totalSpent: number;
  currencyReferenceRate: number; // e.g. 10 means 1 token = ₹10 INR
  lastTransactionAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ITokenLedgerEntry {
  _id: string;
  userId: string;
  walletId: string;
  amount: number;
  balanceAfter: number;
  type: TokenLedgerType;
  direction: TokenLedgerDirection;
  sourceRefId?: string;
  performedBy?: string;
  reason: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  createdAt: string | Date;
}

export enum TokenActionCostKey {
  REQUIREMENT_POST = 'REQUIREMENT_POST',
  PROPOSAL_SUBMIT = 'PROPOSAL_SUBMIT',
  DIRECT_MESSAGE = 'DIRECT_MESSAGE',
  CONTACT_UNLOCK = 'CONTACT_UNLOCK',
  FEATURED_BOOST = 'FEATURED_BOOST',
  PORTFOLIO_EXPANSION = 'PORTFOLIO_EXPANSION',
}

export interface ITokenPricingRule {
  _id: string;
  actionKey: TokenActionCostKey;
  name: string;
  costTokens: number;
  isEnabled: boolean;
  description?: string;
  updatedBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// ==========================================
// 15. Phase 22: Manual Payments & Settings
// ==========================================
export enum ManualPaymentMethod {
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum ManualPaymentStatus {
  PENDING_SUBMISSION = 'PENDING_SUBMISSION',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum ManualPaymentTargetType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  TOKEN_PACKAGE = 'TOKEN_PACKAGE',
}

export interface IPaymentSettings {
  _id?: string;
  upiEnabled: boolean;
  upiId: string;
  upiDisplayName: string;
  qrCodeUrl?: string;
  bankTransferEnabled: boolean;
  bankAccountHolder: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  paymentInstructions: string;
  verificationPolicy: string;
  updatedBy?: string;
  updatedAt?: string | Date;
}

export interface IManualPaymentRequest {
  _id: string;
  orderNumber: string;
  userId: string;
  user?: Partial<IUser>;
  targetType: ManualPaymentTargetType;
  targetPlanId?: string | ISubscriptionPlan;
  tokenPackageQuantity?: number;
  amount: number;
  currency: string;
  paymentMethod: ManualPaymentMethod;
  transactionReference: string;
  proofImageUrl?: string;
  status: ManualPaymentStatus;
  reviewedBy?: string;
  rejectionReason?: string;
  reviewedAt?: string | Date;
  idempotencyKey?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ITokenPackage {
  id: string;
  name: string;
  tokensCount: number;
  priceInr: number;
  popular?: boolean;
  description?: string;
}

// ==========================================
// 16. Phase 23: Dynamic Taxonomy, Custom Fields & Location
// ==========================================
export enum CustomFieldType {
  TEXT = 'TEXT',
  LONG_TEXT = 'LONG_TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  URL = 'URL',
  DATE = 'DATE',
}

export interface ICategoryCustomField {
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required: boolean;
  placeholder?: string;
  order: number;
  defaultValue?: any;
}

export interface IStructuredLocation {
  country: string;
  state: string;
  city: string;
  area?: string; // locality / neighborhood (e.g. Bodakdev, Indiranagar)
  postalCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  isPublicAddress?: boolean; // false = hide precise street address
  geoPoint?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

