import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get()
  async findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  async create(@Body() data: { name: string; legalName?: string; phone?: string; email?: string; address?: string }) {
    return this.organizationsService.create(data);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  async update(@Param('id') id: string, @Body() data: any) {
    return this.organizationsService.update(id, data);
  }
}
