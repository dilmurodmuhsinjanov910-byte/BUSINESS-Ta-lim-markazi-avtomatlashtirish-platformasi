import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get()
  async findAll(@Query('activeOnly') activeOnly?: string) {
    return this.coursesService.findAll(activeOnly !== 'false');
  }

  @Get('catalog')
  async getCatalog() {
    return this.coursesService.getVerifiedCatalog();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async create(@Body() data: CreateCourseDto) {
    return this.coursesService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async update(@Param('id') id: string, @Body() data: UpdateCourseDto) {
    return this.coursesService.update(id, data);
  }
}
