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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { MilestonesService } from './milestones.service';
import { DeliverablesService } from './deliverables.service';
import { ProjectTasksService } from './project-tasks.service';
import { ProjectFilesService } from './project-files.service';
import { ProjectActivitiesService } from './project-activities.service';
import {
  CreateProjectFromApplicationDto,
  UpdateProjectDto,
} from './dto/create-project.dto';
import {
  UpdateProjectStatusDto,
  CancelProjectDto,
  HoldProjectDto,
  CompleteProjectDto,
} from './dto/update-project-status.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/create-milestone.dto';
import {
  CreateDeliverableDto,
  SubmitDeliverableDto,
  RequestRevisionDto,
  ApproveDeliverableDto,
} from './dto/create-deliverable.dto';
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
  CreateProjectFileDto,
} from './dto/create-task.dto';

@ApiTags('Projects & Workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly milestonesService: MilestonesService,
    private readonly deliverablesService: DeliverablesService,
    private readonly tasksService: ProjectTasksService,
    private readonly filesService: ProjectFilesService,
    private readonly activitiesService: ProjectActivitiesService,
  ) {}

  // =========================================================================
  // 1. Projects Core Endpoints
  // =========================================================================

  @Get('projects')
  @ApiOperation({ summary: 'Get list of projects for authenticated user' })
  async getProjects(@Request() req: any, @Query() query: QueryProjectsDto) {
    return this.projectsService.findAll(req.user, query);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get project workspace details by ID or slug' })
  async getProjectById(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.findById(id, req.user);
  }

  @Post('projects/from-application/:applicationId')
  @ApiOperation({ summary: 'Create project workspace from accepted application' })
  async createFromApplication(
    @Request() req: any,
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateProjectFromApplicationDto,
  ) {
    return this.projectsService.createFromApplication(applicationId, req.user, dto);
  }

  @Patch('projects/:id/status')
  @ApiOperation({ summary: 'Update project lifecycle status' })
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    return this.projectsService.updateStatus(id, dto, req.user);
  }

  @Post('projects/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete project' })
  async completeProject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CompleteProjectDto,
  ) {
    return this.projectsService.complete(id, dto, req.user);
  }

  @Post('projects/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel project' })
  async cancelProject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CancelProjectDto,
  ) {
    return this.projectsService.cancel(id, dto, req.user);
  }

  @Post('projects/:id/hold')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Put project on hold' })
  async holdProject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: HoldProjectDto,
  ) {
    return this.projectsService.hold(id, dto, req.user);
  }

  // =========================================================================
  // 2. Milestones Endpoints
  // =========================================================================

  @Get('projects/:projectId/milestones')
  @ApiOperation({ summary: 'Get project milestones' })
  async getMilestones(@Request() req: any, @Param('projectId') projectId: string) {
    return this.milestonesService.findAll(projectId, req.user);
  }

  @Post('projects/:projectId/milestones')
  @ApiOperation({ summary: 'Create milestone for project' })
  async createMilestone(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestonesService.create(projectId, dto, req.user);
  }

  @Patch('projects/:projectId/milestones/:id')
  @ApiOperation({ summary: 'Update milestone' })
  async updateMilestone(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(id, dto, req.user);
  }

  @Patch('milestones/:id')
  @ApiOperation({ summary: 'Update milestone directly' })
  async updateMilestoneDirect(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(id, dto, req.user);
  }

  @Patch('milestones/:id/status')
  @ApiOperation({ summary: 'Update milestone status' })
  async updateMilestoneStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(id, dto, req.user);
  }

  // =========================================================================
  // 3. Deliverables Endpoints
  // =========================================================================

  @Get('projects/:projectId/deliverables')
  @ApiOperation({ summary: 'Get project deliverables' })
  async getDeliverables(@Request() req: any, @Param('projectId') projectId: string) {
    return this.deliverablesService.findAll(projectId, req.user);
  }

  @Post('projects/:projectId/deliverables')
  @ApiOperation({ summary: 'Create deliverable for project' })
  async createDeliverable(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: CreateDeliverableDto,
  ) {
    return this.deliverablesService.create(projectId, dto, req.user);
  }

  @Post('projects/:projectId/deliverables/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit deliverable version' })
  async submitDeliverable(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitDeliverableDto,
  ) {
    return this.deliverablesService.submit(id, dto, req.user);
  }

  @Post('deliverables/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit deliverable directly' })
  async submitDeliverableDirect(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitDeliverableDto,
  ) {
    return this.deliverablesService.submit(id, dto, req.user);
  }

  @Post('projects/:projectId/deliverables/:id/revision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request deliverable revision' })
  async requestRevision(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RequestRevisionDto,
  ) {
    return this.deliverablesService.requestRevision(id, dto, req.user);
  }

  @Post('deliverables/:id/revision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request deliverable revision directly' })
  async requestRevisionDirect(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RequestRevisionDto,
  ) {
    return this.deliverablesService.requestRevision(id, dto, req.user);
  }

  @Post('projects/:projectId/deliverables/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve deliverable' })
  async approveDeliverable(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveDeliverableDto,
  ) {
    return this.deliverablesService.approve(id, dto, req.user);
  }

  @Post('deliverables/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve deliverable directly' })
  async approveDeliverableDirect(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveDeliverableDto,
  ) {
    return this.deliverablesService.approve(id, dto, req.user);
  }

  // =========================================================================
  // 4. Tasks Endpoints
  // =========================================================================

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Get project tasks' })
  async getTasks(@Request() req: any, @Param('projectId') projectId: string) {
    return this.tasksService.findAll(projectId, req.user);
  }

  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create task for project' })
  async createTask(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectTaskDto,
  ) {
    return this.tasksService.create(projectId, dto, req.user);
  }

  @Patch('projects/:projectId/tasks/:id')
  @ApiOperation({ summary: 'Update task' })
  async updateTask(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProjectTaskDto,
  ) {
    return this.tasksService.update(id, dto, req.user);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update task directly' })
  async updateTaskDirect(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProjectTaskDto,
  ) {
    return this.tasksService.update(id, dto, req.user);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status' })
  async updateTaskStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProjectTaskDto,
  ) {
    return this.tasksService.update(id, dto, req.user);
  }

  // =========================================================================
  // 5. Files Endpoints
  // =========================================================================

  @Get('projects/:projectId/files')
  @ApiOperation({ summary: 'Get project files' })
  async getFiles(@Request() req: any, @Param('projectId') projectId: string) {
    return this.filesService.findAll(projectId, req.user);
  }

  @Post('projects/:projectId/files')
  @ApiOperation({ summary: 'Add file metadata to project' })
  async createFile(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectFileDto,
  ) {
    return this.filesService.create(projectId, dto, req.user);
  }

  @Delete('projects/:projectId/files/:id')
  @ApiOperation({ summary: 'Remove file from project' })
  async removeFile(@Request() req: any, @Param('id') id: string) {
    return this.filesService.remove(id, req.user);
  }

  @Delete('project-files/:id')
  @ApiOperation({ summary: 'Remove file directly' })
  async removeFileDirect(@Request() req: any, @Param('id') id: string) {
    return this.filesService.remove(id, req.user);
  }

  // =========================================================================
  // 6. Activity Endpoints
  // =========================================================================

  @Get('projects/:projectId/activity')
  @ApiOperation({ summary: 'Get project audit activity timeline' })
  async getActivity(@Request() req: any, @Param('projectId') projectId: string) {
    return this.activitiesService.findAll(projectId, req.user);
  }
}
