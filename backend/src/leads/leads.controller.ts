import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { LeadsService, CreateOrUpdateLeadDto } from './leads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { LeadStatus, ScoreTier, LeadSource, ActivityType, Role } from '@prisma/client';

@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req: any,
    @Query('status') status?: LeadStatus,
    @Query('scoreTier') scoreTier?: ScoreTier,
    @Query('branchId') branchId?: string,
    @Query('source') source?: LeadSource,
    @Query('search') search?: string,
  ) {
    const user = req.user;
    const effectiveBranchId =
      user && user.role !== Role.SUPER_ADMIN && user.role !== Role.OWNER && user.branchId
        ? user.branchId
        : branchId;

    return this.leadsService.findAll({ status, scoreTier, branchId: effectiveBranchId, source, search });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: any) {
    const lead = await this.leadsService.findOne(id);
    const user = req.user;
    if (
      user &&
      user.role !== Role.SUPER_ADMIN &&
      user.role !== Role.OWNER &&
      user.branchId &&
      lead.preferredBranchId &&
      lead.preferredBranchId !== user.branchId
    ) {
      throw new ForbiddenException('Siz faqat o\'z filialingizga tegishli leadlarni ko\'ra olasiz!');
    }
    return lead;
  }

  // Public or internal lead capture endpoint (e.g. from landing page or Telegram bot)
  @Post()
  async createOrUpdate(@Body() dto: CreateOrUpdateLeadDto) {
    return this.leadsService.upsertLead(dto);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: LeadStatus; lostReason?: string },
    @Request() req: any,
  ) {
    return this.leadsService.updateStatus(id, body.status, body.lostReason, req.user?.id);
  }

  @Post(':id/activity')
  @UseGuards(JwtAuthGuard)
  async addActivity(
    @Param('id') id: string,
    @Body() body: { type: ActivityType; title: string; description?: string },
    @Request() req: any,
  ) {
    return this.leadsService.addActivity(id, body.type, body.title, body.description, req.user?.id);
  }

  @Post(':id/score')
  @UseGuards(JwtAuthGuard)
  async updateScore(
    @Param('id') id: string,
    @Body() body: { delta: number; reason: string },
    @Request() req: any,
  ) {
    return this.leadsService.updateScore(id, body.delta, body.reason, req.user?.id);
  }
}
