import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReportReviewDto, RespondReviewDto } from './dto/report-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ReviewStatus, ReviewReportStatus } from '@brands-creators/types';

@ApiTags('Reviews & Reputation')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // =========================================================================
  // 1. Project Reviews
  // =========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit verified review for a completed project' })
  async createReview(
    @Request() req: any,
    @Body() dto: CreateReviewDto,
  ) {
    const projectId = dto.projectId;
    if (!projectId) {
      throw new BadRequestException('projectId is required');
    }
    return this.reviewsService.createProjectReview(projectId, dto, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('projects/:projectId/reviews')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit verified review for a completed project' })
  async createProjectReview(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createProjectReview(projectId, dto, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('projects/:projectId/reviews')
  @ApiOperation({ summary: 'Get reviews associated with a project' })
  async getProjectReviews(@Request() req: any, @Param('projectId') projectId: string) {
    return this.reviewsService.getProjectReviews(projectId, req.user);
  }

  // =========================================================================
  // 2. Public Reviews & Reputation
  // =========================================================================

  @Get('reviews/public/:userId')
  @ApiOperation({ summary: 'Get published reviews for a creator or brand user' })
  async getPublicReviews(@Param('userId') userId: string, @Query() query: QueryReviewsDto) {
    return this.reviewsService.getPublicReviews(userId, query);
  }

  @Get('creators/:id/reputation')
  @ApiOperation({ summary: 'Get deterministic reputation summary for a creator' })
  async getCreatorReputation(@Param('id') id: string) {
    return this.reviewsService.getReputationSummary(id);
  }

  @Get('brands/:id/reputation')
  @ApiOperation({ summary: 'Get deterministic reputation summary for a brand' })
  async getBrandReputation(@Param('id') id: string) {
    return this.reviewsService.getReputationSummary(id);
  }

  @Get('reputation/:userId')
  @ApiOperation({ summary: 'Get reputation summary for any user' })
  async getUserReputation(@Param('userId') userId: string) {
    return this.reviewsService.getReputationSummary(userId);
  }

  // =========================================================================
  // 3. Review Mutations & Reporting
  // =========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Edit own review content' })
  async updateReview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(id, dto, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('reviews/:id/report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report a review to moderation' })
  async reportReview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviewsService.reportReview(id, dto, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('reviews/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reviewee response to a review' })
  async respondReview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RespondReviewDto,
  ) {
    return this.reviewsService.respondReview(id, dto, req.user);
  }

  // =========================================================================
  // 4. Admin Review Moderation
  // =========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('admin/reviews')
  @ApiOperation({ summary: 'Admin list all reviews with filters' })
  async adminListReviews(@Request() req: any, @Query() query: QueryReviewsDto) {
    return this.reviewsService.adminListReviews(query, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('admin/reviews/:id/status')
  @ApiOperation({ summary: 'Admin update review status (PUBLISHED, HIDDEN, REMOVED)' })
  async adminUpdateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: ReviewStatus,
  ) {
    return this.reviewsService.adminUpdateStatus(id, status, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('admin/reviews/reports')
  @ApiOperation({ summary: 'Admin list review moderation reports' })
  async adminListReports(@Request() req: any) {
    return this.reviewsService.adminListReports(req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('admin/reviews/reports/:id/resolve')
  @ApiOperation({ summary: 'Admin resolve review report' })
  async adminResolveReport(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: ReviewReportStatus,
  ) {
    return this.reviewsService.adminResolveReport(id, status, req.user);
  }
}
