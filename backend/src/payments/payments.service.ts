import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { PaymentStatus, PaymentMethod, LeadStatus, EnrollmentStatus, ActivityType } from '@prisma/client';

import { CreatePaymentDto } from './dto/create-payment.dto';

export { CreatePaymentDto };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

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
      include: {
        lead: {
          include: {
            preferredBranch: true,
            enrollments: {
              include: {
                group: { include: { course: true, branch: true } },
              },
            },
          },
        },
      },
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
      include: {
        lead: true,
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

    // Send Telegram Payment Receipt Notification
    if (payment.lead?.telegramId) {
      const receiptNo = `INV-${payment.id.slice(-6).toUpperCase()}`;
      const dateStr = new Date().toISOString().split('T')[0];
      this.telegramService
        .sendPaymentReceiptAlert(
          payment.lead.telegramId,
          payment.lead.fullName,
          payment.amount,
          receiptNo,
          payment.method,
          dateStr,
          payment.notes || undefined,
        )
        .catch((err: any) => this.logger.warn(`To'lov cheki yuborilmadi: ${err.message}`));
    }

    return updated;
  }

  // Create payment directly as PAID (one-step checkout)
  async createAndPay(dto: CreatePaymentDto, recordedById?: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
    if (!lead) throw new NotFoundException('Lead topilmadi');

    const payment = await this.prisma.payment.create({
      data: {
        leadId: dto.leadId,
        amount: dto.amount,
        currency: dto.currency || 'UZS',
        method: dto.method || PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        notes: dto.notes,
        recordedById,
      },
      include: {
        lead: true,
      },
    });

    // Update lead status to WON
    await this.prisma.lead.update({
      where: { id: dto.leadId },
      data: {
        status: LeadStatus.WON,
        score: 100,
        scoreTier: 'HOT',
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: dto.leadId,
        type: 'STATUS_CHANGE',
        title: 'To\'lov qabul qilindi (Kvitansiya rasmiylashtirildi)',
        description: `Summa: ${dto.amount.toLocaleString()} ${dto.currency || 'UZS'}. Usul: ${dto.method || PaymentMethod.CASH}.`,
        createdById: recordedById,
      },
    });

    // Send Telegram Payment Receipt Notification
    if (lead.telegramId) {
      const receiptNo = `INV-${payment.id.slice(-6).toUpperCase()}`;
      const dateStr = new Date().toISOString().split('T')[0];
      this.telegramService
        .sendPaymentReceiptAlert(
          lead.telegramId,
          lead.fullName,
          dto.amount,
          receiptNo,
          dto.method || PaymentMethod.CASH,
          dateStr,
          dto.notes || undefined,
        )
        .catch((err: any) => this.logger.warn(`To'lov cheki yuborilmadi: ${err.message}`));
    }

    return payment;
  }

  // Financial Analytics & Summary
  async getSummary() {
    const allPaid = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.PAID },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalRevenue = allPaid.reduce((sum, p) => sum + p.amount, 0);
    const monthlyRevenue = allPaid
      .filter((p) => p.paidAt && new Date(p.paidAt) >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    const methodBreakdown = {
      CASH: allPaid.filter((p) => p.method === PaymentMethod.CASH).reduce((s, p) => s + p.amount, 0),
      CLICK: allPaid.filter((p) => p.method === PaymentMethod.CLICK).reduce((s, p) => s + p.amount, 0),
      PAYME: allPaid.filter((p) => p.method === PaymentMethod.PAYME).reduce((s, p) => s + p.amount, 0),
      UZUM: allPaid.filter((p) => p.method === PaymentMethod.UZUM).reduce((s, p) => s + p.amount, 0),
      BANK_TRANSFER: allPaid
        .filter((p) => p.method === PaymentMethod.BANK_TRANSFER)
        .reduce((s, p) => s + p.amount, 0),
    };

    // Calculate total active enrollments and estimated outstanding balance
    const activeEnrollments = await this.prisma.enrollment.findMany({
      where: { status: EnrollmentStatus.ACTIVE },
      include: { lead: true },
    });

    const totalMonthlyTuitionExpected = activeEnrollments.reduce((sum, e) => sum + e.monthlyFee, 0);
    const totalDebts = Math.max(0, totalMonthlyTuitionExpected - monthlyRevenue);

    return {
      totalRevenue,
      monthlyRevenue,
      totalDebts,
      totalPaymentsCount: allPaid.length,
      activeStudentsCount: activeEnrollments.length,
      methodBreakdown,
      currency: 'UZS',
    };
  }

  // Debtors Tracker: Active students with overdue or pending balance this month
  async getDebtors() {
    const activeEnrollments = await this.prisma.enrollment.findMany({
      where: { status: EnrollmentStatus.ACTIVE },
      include: {
        lead: {
          include: {
            preferredBranch: true,
            payments: {
              where: { status: PaymentStatus.PAID },
              orderBy: { paidAt: 'desc' },
            },
          },
        },
        group: {
          include: {
            course: true,
            branch: true,
          },
        },
      },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const debtors = [];

    for (const enrollment of activeEnrollments) {
      const thisMonthPaid = enrollment.lead.payments
        .filter((p) => p.paidAt && new Date(p.paidAt) >= startOfMonth)
        .reduce((sum, p) => sum + p.amount, 0);

      const remainingDebt = Math.max(0, enrollment.monthlyFee - thisMonthPaid);

      if (remainingDebt > 0) {
        const lastPayment = enrollment.lead.payments[0] || null;
        debtors.push({
          enrollmentId: enrollment.id,
          leadId: enrollment.lead.id,
          fullName: enrollment.lead.fullName,
          phone: enrollment.lead.phone,
          telegramId: enrollment.lead.telegramId,
          groupName: enrollment.group.name,
          courseName: enrollment.group.course.name,
          branchName: enrollment.group.branch.name,
          monthlyFee: enrollment.monthlyFee,
          paidThisMonth: thisMonthPaid,
          remainingDebt,
          lastPaymentDate: lastPayment?.paidAt || null,
          dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0], // End of month
        });
      }
    }

    return debtors.sort((a, b) => b.remainingDebt - a.remainingDebt);
  }

  // Get printable official receipt details
  async getReceipt(id: string) {
    const payment = await this.findOne(id);
    const receiptNumber = `INV-${payment.id.slice(-6).toUpperCase()}`;

    const activeEnrollment = (payment.lead as any).enrollments?.[0] || null;

    return {
      receiptNumber,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      paidAt: payment.paidAt || payment.createdAt,
      notes: payment.notes,
      student: {
        id: payment.lead.id,
        fullName: payment.lead.fullName,
        phone: payment.lead.phone,
        telegramId: payment.lead.telegramId,
      },
      course: activeEnrollment?.group?.course?.name || payment.lead.preferredCourse || 'Umumiy Ta\'lim Kursi',
      group: activeEnrollment?.group?.name || 'Asosiy Guruh',
      branch: activeEnrollment?.group?.branch?.name || payment.lead.preferredBranch?.name || 'Bosh Filial',
      organization: {
        name: 'Al-Xorazmiy Ta\'lim Markazi',
        phone: '+998 71 200-00-00',
        address: 'Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko\'chasi',
        inn: '304958271',
      },
      cashier: 'Bosh Administrator',
    };
  }

  // Send polite reminder to debtor via Telegram
  async notifyDebtor(leadId: string, recordedById?: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE },
          include: {
            group: { include: { course: true } },
          },
        },
      },
    });

    if (!lead) throw new NotFoundException('Talaba topilmadi');
    if (!lead.telegramId) {
      throw new BadRequestException('Ushbu talabada Telegram ID mavjud emas, eslatma yuborib bo\'lmaydi');
    }

    const enrollment = lead.enrollments[0];
    const groupName = enrollment?.group?.name || 'Guruh';
    const courseName = enrollment?.group?.course?.name || 'Kurs';
    const amountDue = enrollment?.monthlyFee || 500000;

    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    await this.telegramService.sendPaymentReminderAlert(
      lead.telegramId,
      lead.fullName,
      groupName,
      courseName,
      amountDue,
      dueDate,
    );

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        type: ActivityType.MESSAGE,
        title: 'Telegram to\'lov eslatmasi yuborildi',
        description: `Summa: ${amountDue.toLocaleString()} UZS. Kurs: ${courseName} (${groupName})`,
        createdById: recordedById,
      },
    });

    return {
      success: true,
      leadId,
      fullName: lead.fullName,
      telegramId: lead.telegramId,
      message: 'To\'lov eslatmasi Telegram orqali muvaffaqiyatli yuborildi',
    };
  }
}
