import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus, LeadSource, ScoreTier, ActivityType } from '@prisma/client';

export interface CreateOrUpdateLeadDto {
  fullName: string;
  phone?: string;
  telegramId?: string;
  telegramUsername?: string;
  source?: LeadSource;
  preferredLanguage?: string;
  preferredCourse?: string;
  preferredBranchId?: string;
  notes?: string;
  initialScoreDelta?: number;
}

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  // Phone normalizer to ensure consistent deduplication (+998901234567 format)
  normalizePhone(phone?: string): string {
    if (!phone) return '';
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+998')) {
      return cleaned.slice(0, 13);
    }
    if (cleaned.startsWith('998') && !cleaned.startsWith('+')) {
      return `+${cleaned.slice(0, 12)}`;
    }
    // Only format as Uzbek mobile number if 9 digits AND starts with valid operator code
    const uzbekMobileCodes = ['90', '91', '93', '94', '95', '97', '98', '99', '33', '88', '77', '50', '20'];
    if (cleaned.length === 9 && uzbekMobileCodes.some((code) => cleaned.startsWith(code))) {
      return `+998${cleaned}`;
    }
    if (phone.startsWith('+')) {
      return phone.trim();
    }
    return cleaned;
  }

  calculateTier(score: number): ScoreTier {
    if (score >= 70) return ScoreTier.HOT;
    if (score >= 40) return ScoreTier.WARM;
    return ScoreTier.COLD;
  }

  // De-duplication core logic: checks both phone and telegramId
  async upsertLead(dto: CreateOrUpdateLeadDto, createdById?: string) {
    const rawPhone = dto.phone ? dto.phone.trim() : '';
    const normalizedPhone = rawPhone ? this.normalizePhone(rawPhone) : '';

    const orConditions: any[] = [];
    if (normalizedPhone && !normalizedPhone.startsWith('tg_')) {
      orConditions.push({ phone: normalizedPhone });
    }
    if (dto.telegramId) {
      orConditions.push({ telegramId: dto.telegramId });
    }

    // Look for existing lead by phone or telegramId
    const existing = orConditions.length > 0
      ? await this.prisma.lead.findFirst({
          where: { OR: orConditions },
        })
      : null;

    if (existing) {
      // De-duplication hit: Do not duplicate, update existing lead and record activity
      let newScore = existing.score + (dto.initialScoreDelta || 10);
      newScore = Math.min(100, Math.max(0, newScore));
      const newTier = this.calculateTier(newScore);

      // Don't overwrite real phone with a placeholder
      const phoneToSet =
        normalizedPhone && !normalizedPhone.startsWith('tg_')
          ? normalizedPhone
          : existing.phone;

      const updated = await this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          fullName: dto.fullName || existing.fullName,
          phone: phoneToSet,
          telegramId: dto.telegramId || existing.telegramId,
          telegramUsername: dto.telegramUsername || existing.telegramUsername,
          preferredLanguage: dto.preferredLanguage || existing.preferredLanguage,
          preferredCourse: dto.preferredCourse || existing.preferredCourse,
          preferredBranchId: dto.preferredBranchId || existing.preferredBranchId,
          notes: dto.notes ? `${existing.notes ? existing.notes + ' | ' : ''}${dto.notes}` : existing.notes,
          score: newScore,
          scoreTier: newTier,
        },
      });

      // Log activity timeline
      await this.prisma.leadActivity.create({
        data: {
          leadId: existing.id,
          type: ActivityType.MESSAGE,
          title: 'Qayta murojaat (Dublikat birlashtirildi)',
          description: `Mijoz qayta murojaat qildi. Yangilangan parametrlar saqlandi. Ball: ${existing.score} -> ${newScore}`,
          createdById,
        },
      });

      return { lead: updated, isDuplicate: true };
    }

    // New Lead creation
    const initialScore = 50 + (dto.initialScoreDelta || 0) + (dto.telegramId ? 10 : 0);
    const clampedScore = Math.min(100, Math.max(0, initialScore));
    const tier = this.calculateTier(clampedScore);

    const lead = await this.prisma.lead.create({
      data: {
        fullName: dto.fullName,
        phone: normalizedPhone || (dto.telegramId ? `tg_${dto.telegramId}` : 'NOMA\'LUM'),
        telegramId: dto.telegramId,
        telegramUsername: dto.telegramUsername,
        source: dto.source || LeadSource.TELEGRAM,
        score: clampedScore,
        scoreTier: tier,
        status: LeadStatus.NEW,
        preferredLanguage: dto.preferredLanguage,
        preferredCourse: dto.preferredCourse,
        preferredBranchId: dto.preferredBranchId,
        notes: dto.notes,
        activities: {
          create: [
            {
              type: ActivityType.STATUS_CHANGE,
              title: 'Lead tizimga kiritildi',
              description: `Manba: ${dto.source || 'TELEGRAM'}. Boshlang'ich ball: ${clampedScore} (${tier})`,
              createdById,
            },
          ],
        },
      },
    });

    return { lead, isDuplicate: false };
  }

  async findAll(params?: {
    status?: LeadStatus;
    scoreTier?: ScoreTier;
    branchId?: string;
    source?: LeadSource;
    search?: string;
  }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.scoreTier) where.scoreTier = params.scoreTier;
    if (params?.branchId) where.preferredBranchId = params.branchId;
    if (params?.source) where.source = params.source;

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { phone: { contains: q } },
        { telegramUsername: { contains: q } },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        preferredBranch: true,
        trialBookings: {
          orderBy: { bookingDate: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            activities: true,
            trialBookings: true,
            conversations: true,
            tasks: true,
          },
        },
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        preferredBranch: true,
        activities: {
          orderBy: { createdAt: 'desc' },
        },
        trialBookings: {
          include: {
            group: {
              include: { course: true },
            },
            branch: true,
            reminders: true,
            followUps: true,
          },
          orderBy: { bookingDate: 'desc' },
        },
        conversations: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) throw new NotFoundException('Lead topilmadi');
    return lead;
  }

  // Update lead status with strict validation for LOST reason and score adjustment
  async updateStatus(id: string, newStatus: LeadStatus, lostReason?: string, userId?: string) {
    const lead = await this.findOne(id);

    // Rule: Mandatory lostReason if status is LOST
    if (newStatus === LeadStatus.LOST && (!lostReason || !lostReason.trim())) {
      throw new BadRequestException("Statusni 'LOST' qilish uchun bekor qilish/yo'qotish sababi (lostReason) majburiy!");
    }

    let scoreDelta = 0;
    if (newStatus === LeadStatus.QUALIFIED) scoreDelta = 15;
    if (newStatus === LeadStatus.TRIAL_BOOKED) scoreDelta = 25;
    if (newStatus === LeadStatus.TRIAL_ATTENDED) scoreDelta = 20;
    if (newStatus === LeadStatus.WON) scoreDelta = 50;
    if (newStatus === LeadStatus.LOST) scoreDelta = -50;

    const newScore = Math.min(100, Math.max(0, lead.score + scoreDelta));
    const newTier = this.calculateTier(newScore);

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        status: newStatus,
        lostReason: newStatus === LeadStatus.LOST ? lostReason : null,
        score: newScore,
        scoreTier: newTier,
      },
    });

    // Record activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        type: ActivityType.STATUS_CHANGE,
        title: `Status o'zgardi: ${lead.status} -> ${newStatus}`,
        description: newStatus === LeadStatus.LOST ? `Sabab: ${lostReason}` : `Ball: ${lead.score} -> ${newScore}`,
        createdById: userId,
      },
    });

    return updated;
  }

  async addActivity(leadId: string, type: ActivityType, title: string, description?: string, userId?: string) {
    await this.findOne(leadId);

    return this.prisma.leadActivity.create({
      data: {
        leadId,
        type,
        title,
        description,
        createdById: userId,
      },
    });
  }

  async updateScore(leadId: string, delta: number, reason: string, userId?: string) {
    const lead = await this.findOne(leadId);
    const newScore = Math.min(100, Math.max(0, lead.score + delta));
    const newTier = this.calculateTier(newScore);

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        score: newScore,
        scoreTier: newTier,
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        type: ActivityType.SCORE_UPDATE,
        title: `Ball yangilandi: ${delta > 0 ? '+' : ''}${delta}`,
        description: `Sabab: ${reason}. Yangi ball: ${newScore} (${newTier})`,
        createdById: userId,
      },
    });

    return updated;
  }
}
