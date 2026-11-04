import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, UserStatus } from '@brands-creators/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List platform users (Admin only)' })
  async getUsers(
    @Query() filter: PaginationQueryDto & { role?: UserRole; status?: UserStatus },
  ) {
    return this.usersService.findAll(filter);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user details by ID' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user account status (Admin only)' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: UserStatus }) {
    return this.usersService.updateUserStatus(id, body.status);
  }

  @Patch(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user roles (Super Admin only)' })
  async updateRoles(@Param('id') id: string, @Body() body: { roles: UserRole[] }) {
    return this.usersService.updateUserRoles(id, body.roles);
  }
}
