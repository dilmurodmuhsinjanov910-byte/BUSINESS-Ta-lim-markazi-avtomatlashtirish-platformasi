import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, PaymentMethod, LeadStatus } from '@prisma/client';

import { CreatePaymentDto } from './dto/create-payment.dto';

export { CreatePaymentDto };

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

    // If lead had an active or attended trial booking in a group, increment enrolled students count
    const latestBooking = await this.prisma.trialBooking.findFirst({
      where: { leadId: payment.leadId },
      orderBy: { bookingDate: 'desc' },
    });
    if (latestBooking) {
      const group = await this.prisma.group.findUnique({ where: { id: latestBooking.groupId } });
      if (group && group.currentStudents < group.maxStudents) {
        const newCount = group.currentStudents + 1;
        await this.prisma.group.update({
          where: { id: group.id },
          data: {
            currentStudents: newCount,
            status: newCount >= group.maxStudents ? 'FULL' : group.status,
          },
        });
      }
    }

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
