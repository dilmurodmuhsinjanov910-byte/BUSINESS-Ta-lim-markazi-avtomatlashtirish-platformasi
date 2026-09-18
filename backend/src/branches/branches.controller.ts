import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Get()
  async findAll(@Query('activeOnly') activeOnly?: string) {
    return this.branchesService.findAll(activeOnly === 'true');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async create(@Body() data: CreateBranchDto) {
    return this.branchesService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async update(@Param('id') id: string, @Body() data: UpdateBranchDto) {
    return this.branchesService.update(id, data);
  }
}
