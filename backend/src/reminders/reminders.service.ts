import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ReminderStatus } from '@prisma/client';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(status?: ReminderStatus) {
    return this.prisma.reminder.findMany({
      where: status ? { status } : undefined,
      include: {
        booking: {
          include: {
            lead: true,
            group: { include: { course: true } },
            branch: true,
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  // Runs every 5 minutes to process due reminders
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processDueReminders() {
    const now = new Date();
    const dueReminders = await this.prisma.reminder.findMany({
      where: {
        status: ReminderStatus.PENDING,
        scheduledAt: { lte: now },
      },
      include: {
        booking: {
          include: {
            lead: true,
            group: { include: { course: true } },
            branch: true,
          },
        },
      },
    });

    if (dueReminders.length === 0) return { processed: 0 };

    this.logger.log(`Topildi: ${dueReminders.length} ta yuborilishi kerak bo'lgan eslatma.`);

    for (const reminder of dueReminders) {
      try {
        const lead = reminder.booking.lead;
        const group = reminder.booking.group;
        const branch = reminder.booking.branch;
        const typeText = reminder.reminderType === 'BEFORE_24H' ? '24 soatlik' : '2 soatlik';

        const message = `Hurmatli ${lead.fullName}! Eslatma: Sizning "${group.course.name}" kursi bo'yicha bepul sinov darsingiz vaqti yaqinlashmoqda.\n` +
          `Filial: ${branch.name} (${branch.address})\nVaqt: ${reminder.booking.timeSlot}\n` +
          `Iltimos, dars boshlanishidan 15 daqiqa oldin tashrif buyuring!`;

        // Mark as SENT
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: ReminderStatus.SENT,
            sentAt: new Date(),
          },
        });

        // Add lead activity
        await this.prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'MESSAGE',
            title: `Eslatma yuborildi (${typeText})`,
            description: message,
          },
        });

        this.logger.log(`Eslatma yuborildi: [${reminder.id}] Lead: ${lead.fullName}`);
      } catch (err: any) {
        this.logger.error(`Eslatma yuborishda xato: [${reminder.id}]`, err.stack);
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: ReminderStatus.FAILED,
            errorLog: err.message,
          },
        });
      }
    }

    return { processed: dueReminders.length };
  }

  async triggerManualDispatch() {
    return this.processDueReminders();
  }
}
