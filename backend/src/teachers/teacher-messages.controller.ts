import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TeacherMessagesService, ReplyTeacherMessageDto } from './teacher-messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('teacher-messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherMessagesController {
  constructor(private teacherMessagesService: TeacherMessagesService) {}

  @Get('conversations')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER, Role.OPERATOR)
  async getConversations() {
    return this.teacherMessagesService.getConversations();
  }

  @Get(':teacherId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER, Role.OPERATOR, Role.TEACHER)
  async getMessages(@Param('teacherId') teacherId: string) {
    return this.teacherMessagesService.getMessages(teacherId);
  }

  @Post(':teacherId/reply')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER, Role.OPERATOR)
  async replyFromAdmin(
    @Param('teacherId') teacherId: string,
    @Body() dto: ReplyTeacherMessageDto,
  ) {
    return this.teacherMessagesService.replyFromAdmin(teacherId, dto.content);
  }

  @Post(':teacherId/send')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER, Role.TEACHER)
  async sendFromTeacher(
    @Param('teacherId') teacherId: string,
    @Body() dto: ReplyTeacherMessageDto,
  ) {
    return this.teacherMessagesService.sendFromTeacher(teacherId, dto.content);
  }
}
