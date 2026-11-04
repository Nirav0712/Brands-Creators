import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProjectFile, ProjectFileDocument } from './schemas/project-file.schema';
import { ProjectsService } from './projects.service';
import { ProjectActivityType } from '@brands-creators/types';
import { CreateProjectFileDto } from './dto/create-task.dto';

@Injectable()
export class ProjectFilesService {
  constructor(
    @InjectModel(ProjectFile.name)
    private readonly fileModel: Model<ProjectFileDocument>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(projectId: string, dto: CreateProjectFileDto, requestingUser: any): Promise<ProjectFileDocument> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    let milestoneId: Types.ObjectId | undefined;
    if (dto.milestoneId && Types.ObjectId.isValid(dto.milestoneId)) {
      milestoneId = new Types.ObjectId(dto.milestoneId);
    }

    const file = new this.fileModel({
      projectId: project._id,
      milestoneId,
      uploadedBy: new Types.ObjectId(reqUserId),
      fileName: dto.fileName,
      url: dto.url,
      publicId: dto.publicId,
      mimeType: dto.mimeType || 'application/octet-stream',
      size: dto.size || 0,
      description: dto.description,
      version: 1,
    });

    const saved = await file.save();

    await this.projectsService.logActivity(
      project._id as Types.ObjectId,
      new Types.ObjectId(reqUserId),
      ProjectActivityType.FILE_UPLOADED,
      `Project file uploaded: "${saved.fileName}"`,
      { fileId: saved._id, fileName: saved.fileName, url: saved.url },
    );

    return saved;
  }

  async findAll(projectId: string, requestingUser: any): Promise<ProjectFileDocument[]> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const project = await this.projectsService.verifyProjectAccess(
      projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    return this.fileModel
      .find({ projectId: project._id })
      .populate('uploadedBy', 'fullName email avatarUrl')
      .sort({ createdAt: -1 });
  }

  async remove(fileId: string, requestingUser: any): Promise<any> {
    if (!Types.ObjectId.isValid(fileId)) {
      throw new BadRequestException('Invalid file ID');
    }

    const file = await this.fileModel.findById(fileId);
    if (!file) {
      throw new NotFoundException('Project file not found');
    }

    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    await this.projectsService.verifyProjectAccess(
      file.projectId,
      reqUserId,
      requestingUser.roles?.[0],
    );

    await this.fileModel.findByIdAndDelete(fileId);
    return { success: true, message: 'File removed successfully' };
  }
}
