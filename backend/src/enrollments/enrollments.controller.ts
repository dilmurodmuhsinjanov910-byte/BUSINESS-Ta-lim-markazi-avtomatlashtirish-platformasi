import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR, Role.OWNER)
  async createEnrollment(@Body() dto: CreateEnrollmentDto, @Request() req?: any) {
    return this.enrollmentsService.create(dto, req?.user?.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR, Role.TEACHER, Role.OWNER)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER)
  async getTeacherPortalData(@Query('teacherId') teacherId?: string, @Request() req?: any) {
    let effectiveTeacherId: string | undefined;
    if (req?.user?.role === Role.TEACHER) {
      // Role.TEACHER can strictly only access their own portal data; query parameter is ignored
      effectiveTeacherId = req.user.id;
    } else {
      // Role.ADMIN, SUPER_ADMIN, OWNER may supply custom teacherId or default to caller
      effectiveTeacherId = teacherId || req?.user?.id;
    }
    return this.enrollmentsService.getTeacherPortalData(effectiveTeacherId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR, Role.TEACHER, Role.OWNER)
  async getEnrollmentById(@Param('id') id: string) {
    return this.enrollmentsService.getEnrollmentById(id);
  }
}

