import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TeachersService, CreateTeacherDto, UpdateTeacherDto } from './teachers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private teachersService: TeachersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER, Role.ACCOUNTANT, Role.OPERATOR)
  async findAll() {
    return this.teachersService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER)
  async findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER)
  async create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER)
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teachersService.update(id, dto);
  }

  @Put(':id/assign-group')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER)
  async assignGroup(@Param('id') id: string, @Body() dto: any) {
    return this.teachersService.assignGroup(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER)
  async remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }
}
