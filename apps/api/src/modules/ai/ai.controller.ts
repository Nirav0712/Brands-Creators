import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { SemanticMatchDto, ProposalPitchDto, OptimizeBriefDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('AI Intelligence')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } })
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('match-score')
  @ApiOperation({ summary: 'Calculate AI semantic match score and insights between Creator and Requirement' })
  async getSemanticMatch(@Body() dto: SemanticMatchDto) {
    return this.aiService.calculateSemanticMatch(dto.requirementId, dto.applicantId);
  }

  @Post('proposal-pitch')
  @ApiOperation({ summary: 'Generate tailored AI proposal pitch and milestone suggestions for creators' })
  async generateProposalPitch(@CurrentUser() user: UserDocument, @Body() dto: ProposalPitchDto) {
    return this.aiService.generateProposalPitch(user._id.toString(), dto);
  }

  @Post('optimize-brief')
  @ApiOperation({ summary: 'Analyze and optimize brand campaign brief with AI market insights' })
  async optimizeBrief(@Body() dto: OptimizeBriefDto) {
    return this.aiService.optimizeBrief(dto);
  }
}
