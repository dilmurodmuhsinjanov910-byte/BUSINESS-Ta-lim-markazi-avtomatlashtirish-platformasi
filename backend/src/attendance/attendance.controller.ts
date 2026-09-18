import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  async recordAttendance(@Body() dto: RecordAttendanceDto, @Request() req?: any) {
    if (req?.user?.id) {
      dto.markedById = req.user.id;
    }
    return this.attendanceService.recordAttendance(dto);
  }

  @Get('group/:groupId')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  async getGroupAttendance(
    @Param('groupId') groupId: string,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getGroupAttendance(groupId, date);
  }
}

