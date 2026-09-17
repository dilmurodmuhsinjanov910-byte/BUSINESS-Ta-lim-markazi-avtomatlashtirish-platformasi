import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentStatus } from '@prisma/client';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  async createEnrollment(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.createEnrollment(dto);
  }

  @Get()
  async getAllEnrollments(
    @Query('groupId') groupId?: string,
    @Query('status') status?: EnrollmentStatus,
  ) {
    return this.enrollmentsService.getAllEnrollments({ groupId, status });
  }

  @Get('student/:identifier')
  async getStudentPortalData(@Param('identifier') identifier: string) {
    return this.enrollmentsService.getStudentPortalData(identifier);
  }

  @Get('teacher')
  async getTeacherPortalData(@Query('teacherId') teacherId?: string) {
    return this.enrollmentsService.getTeacherPortalData(teacherId);
  }

  @Get(':id')
  async getEnrollmentById(@Param('id') id: string) {
    return this.enrollmentsService.getEnrollmentById(id);
  }
}
