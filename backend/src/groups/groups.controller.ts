import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, GroupStatus } from '@prisma/client';

@Controller('groups')
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Get()
  async findAll(
    @Query('branchId') branchId?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: GroupStatus,
  ) {
    return this.groupsService.findAll({ branchId, courseId, status });
  }

  @Get('available-for-trial')
  async getAvailableForTrial(
    @Query('branchId') branchId?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.groupsService.findAvailableForTrial(branchId, courseId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async create(@Body() data: any) {
    return this.groupsService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async update(@Param('id') id: string, @Body() data: any) {
    return this.groupsService.update(id, data);
  }
}
