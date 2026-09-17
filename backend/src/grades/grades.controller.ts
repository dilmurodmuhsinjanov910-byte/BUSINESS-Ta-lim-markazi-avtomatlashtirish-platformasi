import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { GradesService } from './grades.service';
import { RecordGradeDto } from './dto/record-grade.dto';

@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  async recordGrade(@Body() dto: RecordGradeDto) {
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
