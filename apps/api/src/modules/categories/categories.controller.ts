import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, CreateSubCategoryDto, ReorderCategoriesDto } from './dto/category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, CategoryType } from '@brands-creators/types';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active professional categories & subcategories' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, enum: CategoryType })
  async getCategories(
    @Query('includeInactive') includeInactive?: string,
    @Query('type') type?: CategoryType,
  ) {
    return this.categoriesService.findAll(includeInactive === 'true', type);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get hierarchical category tree (Categories -> Subcategories -> Specializations)' })
  async getCategoryTree(): Promise<any[]> {
    return this.categoriesService.getCategoryTree();
  }

  @Get('for-role/:role')
  @ApiOperation({ summary: 'Get categories supported for a specific profile type (CREATOR, BRAND, etc.)' })
  async getCategoriesForRole(@Param('role') role: UserRole) {
    return this.categoriesService.findByRole(role);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get category details by slug' })
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findOneBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category details by ID' })
  async getCategoryById(@Param('id') id: string) {
    return this.categoriesService.findOneById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder categories sort order (Admin only)' })
  async reorderCategories(@Body() dto: ReorderCategoriesDto) {
    return this.categoriesService.reorder(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (Admin only)' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Post(':id/subcategories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a subcategory to category (Admin only)' })
  async addSubCategory(@Param('id') id: string, @Body() dto: CreateSubCategoryDto) {
    return this.categoriesService.addSubCategory(id, dto);
  }

  @Patch(':id/subcategories/:subSlug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subcategory (Admin only)' })
  async updateSubCategory(
    @Param('id') id: string,
    @Param('subSlug') subSlug: string,
    @Body() dto: Partial<CreateSubCategoryDto>,
  ) {
    return this.categoriesService.updateSubCategory(id, subSlug, dto);
  }

  @Delete(':id/subcategories/:subSlug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a subcategory (Admin only)' })
  async removeSubCategory(@Param('id') id: string, @Param('subSlug') subSlug: string) {
    return this.categoriesService.removeSubCategory(id, subSlug);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a category (Soft delete) (Admin only)' })
  async archiveCategory(@Param('id') id: string) {
    return this.categoriesService.archiveCategory(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permanently delete a category (Admin only)' })
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}

