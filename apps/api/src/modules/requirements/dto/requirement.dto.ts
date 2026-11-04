import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
  IsBoolean,
  IsObject,
  Min,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequirementStatus, BudgetType } from '@brands-creators/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class RequirementFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  remote?: boolean;

  @IsOptional()
  @Type(() => Number)
  minBudget?: number;

  @IsOptional()
  @Type(() => Number)
  maxBudget?: number;

  @IsOptional()
  @IsIn([...Object.values(RequirementStatus), 'ALL'])
  status?: RequirementStatus | 'ALL';

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsString()
  sort?: string;
}

export class CreateRequirementDto {
  @IsString()
  @IsNotEmpty({ message: 'Requirement title is required' })
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  categoryId: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subcategoryIds?: string[];

  @IsOptional()
  location?: {
    city?: string;
    state?: string;
    country: string;
    isRemote: boolean;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceLocations?: string[];

  @IsOptional()
  @IsBoolean()
  remoteAllowed?: boolean;

  @IsOptional()
  @IsEnum(BudgetType)
  budgetType?: BudgetType;

  @IsNotEmpty()
  budget: {
    min: number;
    max: number;
    currency: string;
  };

  @IsDateString()
  @IsNotEmpty({ message: 'Application deadline is required' })
  applicationDeadline: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  professionalsRequired?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @IsOptional()
  @IsString()
  preferredExperience?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredLanguages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPlatforms?: string[];

  @IsOptional()
  @IsString()
  targetIndustry?: string;

  @IsOptional()
  @IsString()
  genderPreference?: string;

  @IsOptional()
  @IsArray()
  attachments?: Array<{
    url: string;
    name: string;
    fileType?: string;
    sizeBytes?: number;
  }>;

  @IsOptional()
  @IsObject()
  categorySpecificFields?: Record<string, any>;

  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;

  @IsOptional()
  @IsString()
  visibility?: string;
}

export class UpdateRequirementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;

  @IsOptional()
  budget?: {
    min: number;
    max: number;
    currency: string;
  };

  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredLanguages?: string[];

  @IsOptional()
  @IsObject()
  categorySpecificFields?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

export class UpdateRequirementStatusDto {
  @IsEnum(RequirementStatus, { message: 'Valid requirement status is required' })
  @IsNotEmpty()
  status: RequirementStatus;
}
