import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReminderStatus } from '@prisma/client';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  @Get()
  async findAll(@Query('status') status?: ReminderStatus) {
    return this.remindersService.findAll(status);
  }

  @Post('trigger-dispatch')
  async triggerDispatch() {
    return this.remindersService.triggerManualDispatch();
  }
}
