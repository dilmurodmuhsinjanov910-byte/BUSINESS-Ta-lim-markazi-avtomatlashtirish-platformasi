import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus, BookingStatus, ScoreTier } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardKpis() {
    const [
      totalLeads,
      newLeads,
      hotLeads,
      trialBookedLeads,
      trialAttendedLeads,
      wonLeads,
      lostLeads,
      totalBookings,
      attendedBookings,
      missedBookings,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { status: LeadStatus.NEW } }),
      this.prisma.lead.count({ where: { scoreTier: ScoreTier.HOT } }),
      this.prisma.lead.count({ where: { status: LeadStatus.TRIAL_BOOKED } }),
      this.prisma.lead.count({ where: { status: LeadStatus.TRIAL_ATTENDED } }),
      this.prisma.lead.count({ where: { status: LeadStatus.WON } }),
      this.prisma.lead.count({ where: { status: LeadStatus.LOST } }),
      this.prisma.trialBooking.count(),
      this.prisma.trialBooking.count({ where: { status: BookingStatus.ATTENDED } }),
      this.prisma.trialBooking.count({ where: { status: BookingStatus.MISSED } }),
    ]);

    const decidedTrials = attendedBookings + missedBookings;
    const trialShowUpRate = decidedTrials > 0 ? Math.round((attendedBookings / decidedTrials) * 100) : 0;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    return {
      totalLeads,
      newLeads,
      hotLeads,
      trialBookedLeads,
      trialAttendedLeads,
      wonLeads,
      lostLeads,
      totalBookings,
      attendedBookings,
      missedBookings,
      trialShowUpRate,
      conversionRate,
    };
  }

  async getConversionFunnel() {
    const statuses = [
      LeadStatus.NEW,
      LeadStatus.CONTACTED,
      LeadStatus.QUALIFIED,
      LeadStatus.TRIAL_BOOKED,
      LeadStatus.TRIAL_ATTENDED,
      LeadStatus.WON,
    ];

    const counts = await Promise.all(
      statuses.map((status) => this.prisma.lead.count({ where: { status } })),
    );

    const lostCount = await this.prisma.lead.count({ where: { status: LeadStatus.LOST } });

    return {
      funnel: statuses.map((status, index) => ({
        stage: status,
        count: counts[index],
      })),
      lostCount,
    };
  }

  async getSourcesBreakdown() {
    const leads = await this.prisma.lead.groupBy({
      by: ['source'],
      _count: { id: true },
    });

    return leads.map((item) => ({
      source: item.source,
      count: item._count.id,
    }));
  }

  async getScoreTierBreakdown() {
    const tiers = await this.prisma.lead.groupBy({
      by: ['scoreTier'],
      _count: { id: true },
    });

    return tiers.map((item) => ({
      tier: item.scoreTier,
      count: item._count.id,
    }));
  }
}
