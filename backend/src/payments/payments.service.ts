import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, PaymentMethod, LeadStatus } from '@prisma/client';

export interface CreatePaymentDto {
  leadId: string;
  amount: number;
  currency?: string;
  method?: PaymentMethod;
  notes?: string;
}

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: PaymentStatus) {
    return this.prisma.payment.findMany({
      where: status ? { status } : undefined,
      include: {
        lead: {
          include: { preferredBranch: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { lead: true },
    });
    if (!payment) throw new NotFoundException('To\'lov topilmadi');
    return payment;
  }

  async create(dto: CreatePaymentDto, recordedById?: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
    if (!lead) throw new NotFoundException('Lead topilmadi');

    return this.prisma.payment.create({
      data: {
        leadId: dto.leadId,
        amount: dto.amount,
        currency: dto.currency || 'UZS',
        method: dto.method || PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
        notes: dto.notes,
        recordedById,
      },
    });
  }

  async markAsPaid(id: string, recordedById?: string) {
    const payment = await this.findOne(id);

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        recordedById,
      },
    });

    // Automatically update lead status to WON and score to 100
    await this.prisma.lead.update({
      where: { id: payment.leadId },
      data: {
        status: LeadStatus.WON,
        score: 100,
        scoreTier: 'HOT',
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: payment.leadId,
        type: 'STATUS_CHANGE',
        title: 'To\'lov qabul qilindi (Mijoz yutildi - WON)',
        description: `Summa: ${payment.amount.toLocaleString()} ${payment.currency}. Usul: ${payment.method}. Status: WON`,
        createdById: recordedById,
      },
    });

    return updated;
  }
}
