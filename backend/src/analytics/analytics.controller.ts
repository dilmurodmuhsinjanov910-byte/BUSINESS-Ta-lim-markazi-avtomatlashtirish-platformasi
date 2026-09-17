import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('kpis')
  async getKpis() {
    return this.analyticsService.getDashboardKpis();
  }

  @Get('funnel')
  async getFunnel() {
    return this.analyticsService.getConversionFunnel();
  }

  @Get('sources')
  async getSources() {
    return this.analyticsService.getSourcesBreakdown();
  }

  @Get('tiers')
  async getTiers() {
    return this.analyticsService.getScoreTierBreakdown();
  }
}
