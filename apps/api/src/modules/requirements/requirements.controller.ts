import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import {
  CreateRequirementDto,
  UpdateRequirementDto,
  RequirementFilterDto,
  UpdateRequirementStatusDto,
} from './dto/requirement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, RequirementStatus } from '@brands-creators/types';

@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  async findAll(@Query() filter: RequirementFilterDto): Promise<any> {
    return this.requirementsService.findAll(filter);
  }

  @Get('brand/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getMyBrandRequirements(
    @Request() req: any,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.requirementsService.findBrandRequirements(
      req.user.sub || req.user.userId,
      status,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getMyRequirements(
    @Request() req: any,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.requirementsService.findBrandRequirements(
      req.user.sub || req.user.userId,
      status,
    );
  }

  @Get('creator/recommended')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getRecommended(@Request() req: any): Promise<any> {
    return this.requirementsService.getRecommendedForCreator(
      req.user.sub || req.user.userId,
    );
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string): Promise<any> {
    return this.requirementsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(
    @Request() req: any,
    @Body() dto: CreateRequirementDto,
  ): Promise<any> {
    return this.requirementsService.create(req.user.sub || req.user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRequirementDto,
  ): Promise<any> {
    return this.requirementsService.update(
      req.user.sub || req.user.userId,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRequirementStatusDto,
  ): Promise<any> {
    const roles = Array.isArray(req.user.roles)
      ? req.user.roles
      : [req.user.role || req.user.roleName].filter(Boolean);
    return this.requirementsService.updateStatus(
      req.user.sub || req.user.userId,
      id,
      dto.status,
      roles,
    );
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async duplicate(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.requirementsService.duplicate(
      req.user.sub || req.user.userId,
      id,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async delete(@Request() req: any, @Param('id') id: string): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    const roles = req.user.roles || [req.user.role];
    return this.requirementsService.remove(userId, id, roles);
  }

  @Patch('admin/:id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async adminModerate(
    @Param('id') id: string,
    @Body('status') status: RequirementStatus,
    @Body('featured') featured?: boolean,
  ): Promise<any> {
    return this.requirementsService.adminModerate(id, status, featured);
  }
}
