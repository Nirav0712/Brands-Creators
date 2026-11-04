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
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
} from './dto/application.dto';
import { BulkApplicationStatusDto } from './dto/bulk-application-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@brands-creators/types';

@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll(@Query() query: any): Promise<any> {
    return this.applicationsService.findAll(query);
  }

  @Post()
  @Roles(UserRole.CREATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async apply(@Request() req: any, @Body() dto: CreateApplicationDto): Promise<any> {
    return this.applicationsService.apply(req.user.sub || req.user.userId, dto);
  }

  @Get('my')
  @Roles(UserRole.CREATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getMyApplications(
    @Request() req: any,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.applicationsService.getMyApplications(
      req.user.sub || req.user.userId,
      status,
    );
  }

  @Get('check/:requirementId')
  async checkExisting(
    @Request() req: any,
    @Param('requirementId') requirementId: string,
  ): Promise<any> {
    return this.applicationsService.checkExistingApplication(
      req.user.sub || req.user.userId,
      requirementId,
    );
  }

  @Get('requirement/:requirementId')
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getRequirementApplicants(
    @Request() req: any,
    @Param('requirementId') requirementId: string,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.applicationsService.getApplicantsForRequirement(
      req.user.sub || req.user.userId,
      requirementId,
      status,
    );
  }

  @Patch('bulk-status')
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async bulkUpdateStatus(
    @Request() req: any,
    @Body() dto: BulkApplicationStatusDto,
  ): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    const roles = req.user.roles || [req.user.role];
    return this.applicationsService.bulkUpdateStatus(userId, dto, roles);
  }

  @Patch(':id/status')
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ): Promise<any> {
    return this.applicationsService.updateStatus(
      req.user.sub || req.user.userId,
      id,
      dto,
    );
  }

  @Patch(':id/withdraw')
  @Roles(UserRole.CREATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async withdraw(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.applicationsService.withdraw(req.user.sub || req.user.userId, id);
  }
}
