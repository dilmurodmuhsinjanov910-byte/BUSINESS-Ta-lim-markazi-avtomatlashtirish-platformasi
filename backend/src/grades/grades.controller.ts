import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { GradesService } from './grades.service';
import { RecordGradeDto } from './dto/record-grade.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  async recordGrade(@Body() dto: RecordGradeDto, @Request() req?: any) {
    if (!dto.markedById && req?.user?.id) {
      dto.markedById = req.user.id;
    }
    return this.gradesService.recordGrade(dto);
  }

  @Get('group/:groupId')
  async getGroupGrades(@Param('groupId') groupId: string) {
    return this.gradesService.getGroupGrades(groupId);
  }

  @Get('enrollment/:enrollmentId')
  async getStudentGrades(@Param('enrollmentId') enrollmentId: string) {
    return this.gradesService.getStudentGrades(enrollmentId);
  }
}

