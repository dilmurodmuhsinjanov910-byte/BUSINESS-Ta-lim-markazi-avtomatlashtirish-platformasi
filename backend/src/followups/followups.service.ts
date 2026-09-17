import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FollowUpStatus, TaskType, TaskPriority, TaskStatus } from '@prisma/client';

@Injectable()
export class FollowupsService {
  private readonly logger = new Logger(FollowupsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(status?: FollowUpStatus) {
    return this.prisma.followUp.findMany({
      where: status ? { status } : undefined,
      include: {
        booking: {
          include: {
            lead: true,
            group: { include: { course: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  // Runs every 10 minutes to process due follow-ups
  @Cron(CronExpression.EVERY_10_MINUTES)
  async processDueFollowUps() {
    const now = new Date();
    const dueFollowUps = await this.prisma.followUp.findMany({
      where: {
        status: FollowUpStatus.PENDING,
        scheduledAt: { lte: now },
      },
      include: {
        booking: {
          include: {
            lead: true,
            group: { include: { course: true } },
          },
        },
      },
      orderBy: { sequence: 'asc' },
    });

    if (dueFollowUps.length === 0) return { processed: 0, escalated: 0 };

    this.logger.log(`Topildi: ${dueFollowUps.length} ta yuborilishi kerak bo'lgan follow-up.`);
    let escalatedCount = 0;

    for (const followUp of dueFollowUps) {
      const lead = followUp.booking.lead;
      const group = followUp.booking.group;

      if (followUp.sequence <= 2) {
        // Safe auto follow-up within 2-attempt non-spam limit
        await this.prisma.followUp.update({
          where: { id: followUp.id },
          data: {
            status: FollowUpStatus.SENT,
            sentAt: new Date(),
          },
        });

        // Add lead activity
        await this.prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'MESSAGE',
            title: `Qayta aloqa (Follow-up #${followUp.sequence}) yuborildi`,
            description: followUp.messageText || `Dars qoldirilganidan so'ng ${followUp.sequence === 1 ? '2 soatlik' : '24 soatlik'} xabar.`,
          },
        });

        this.logger.log(`Follow-up #${followUp.sequence} yuborildi: [${followUp.id}] Lead: ${lead.fullName}`);

        // If this was sequence 2, check if subsequent escalation is needed
        if (followUp.sequence === 2) {
          // Check if lead has already responded or converted
          const leadFresh = await this.prisma.lead.findUnique({ where: { id: lead.id } });
          if (leadFresh && leadFresh.status !== 'WON' && leadFresh.status !== 'TRIAL_ATTENDED') {
            // Escalate to Admin Task: Max 2 auto follow-up rule reached
            await this.prisma.task.create({
              data: {
                title: `Dars qoldirgan o'quvchi bilan bog'lanish: ${lead.fullName}`,
                description: `O'quvchi "${group.course.name}" bo'yicha sinov darsiga kelmadi. 2 marta avtomatik follow-up yuborildi, javob bermadi. Shaxsiy qo'ng'iroq qilish zarur! Tel: ${lead.phone}`,
                taskType: TaskType.CONTACT_TRIAL_MISSED,
                priority: TaskPriority.HIGH,
                status: TaskStatus.TODO,
                leadId: lead.id,
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // due in 24 hours
              },
            });

            await this.prisma.followUp.update({
              where: { id: followUp.id },
              data: { status: FollowUpStatus.ESCALATED },
            });

            await this.prisma.leadActivity.create({
              data: {
                leadId: lead.id,
                type: 'SYSTEM',
                title: 'Follow-up limiti tugadi: Admin vazifasiga eskalatsiya qilindi',
                description: '2 ta avtomat xabarga javob olinmadi. Administratorga shaxsiy qo\'ng\'iroq qilish vazifasi yaratildi.',
              },
            });

            escalatedCount++;
          }
        }
      }
    }

    return { processed: dueFollowUps.length, escalated: escalatedCount };
  }

  async markResponded(id: string) {
    return this.prisma.followUp.update({
      where: { id },
      data: { status: FollowUpStatus.RESPONDED },
    });
  }

  async triggerManualDispatch() {
    return this.processDueFollowUps();
  }
}
