import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { FollowupsService } from './followups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FollowUpStatus } from '@prisma/client';

@Controller('followups')
@UseGuards(JwtAuthGuard)
export class FollowupsController {
  constructor(private followupsService: FollowupsService) {}

  @Get()
  async findAll(@Query('status') status?: FollowUpStatus) {
    return this.followupsService.findAll(status);
  }

  @Post(':id/responded')
  async markResponded(@Param('id') id: string) {
    return this.followupsService.markResponded(id);
  }

  @Post('trigger-dispatch')
  async triggerDispatch() {
    return this.followupsService.triggerManualDispatch();
  }
}
