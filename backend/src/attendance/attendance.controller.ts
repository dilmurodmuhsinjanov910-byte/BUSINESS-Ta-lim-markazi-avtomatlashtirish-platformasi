import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  async recordAttendance(@Body() dto: RecordAttendanceDto) {
    return this.attendanceService.recordAttendance(dto);
  }

  @Get('group/:groupId')
  async getGroupAttendance(
    @Param('groupId') groupId: string,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getGroupAttendance(groupId, date);
  }
}
