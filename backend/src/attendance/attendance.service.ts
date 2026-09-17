import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  async recordAttendance(dto: RecordAttendanceDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
    });
    if (!group) {
      throw new NotFoundException(`Guruh topilmadi (ID: ${dto.groupId})`);
    }

    // Normalize date to start of day (midnight UTC)
    const targetDate = new Date(dto.date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const results: any[] = [];

    for (const item of dto.records) {
      // IDOR Verification: Ensure enrollment exists and belongs to target group
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { id: item.enrollmentId },
      });
      if (!enrollment) {
        throw new NotFoundException(`Biriktirilgan o'quvchi topilmadi (ID: ${item.enrollmentId})`);
      }
      const enrollmentGroupId = enrollment.groupId || (enrollment as any).group?.id;
      if (enrollmentGroupId && enrollmentGroupId !== dto.groupId) {
        throw new BadRequestException(
          `Biriktirilgan o'quvchi (ID: ${item.enrollmentId}) ushbu guruhga (ID: ${dto.groupId}) tegishli emas`,
        );
      }

      // Find if an attendance record already exists for this enrollment on this date
      const existing = await this.prisma.attendance.findFirst({
        where: {
          enrollmentId: item.enrollmentId,
          date: {
            gte: targetDate,
            lt: nextDay,
          },
        },
      });

      if (existing) {
        const updated = await this.prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: item.status,
            notes: item.notes,
            markedById: dto.markedById,
          },
          include: {
            enrollment: {
              include: { lead: true },
            },
          },
        });
        results.push(updated);
      } else {
        const created = await this.prisma.attendance.create({
          data: {
            enrollmentId: item.enrollmentId,
            groupId: dto.groupId,
            date: targetDate,
            status: item.status,
            notes: item.notes,
            markedById: dto.markedById,
          },
          include: {
            enrollment: {
              include: { lead: true },
            },
          },
        });
        results.push(created);
      }

      // Send real-time attendance alert if student has Telegram ID
      const savedRecord = existing ? results[results.length - 1] : results[results.length - 1];
      const lead = savedRecord?.enrollment?.lead;
      if (lead?.telegramId) {
        const dateStr = targetDate.toISOString().split('T')[0];
        this.telegramService
          .sendAttendanceAlert(lead.telegramId, lead.fullName, item.status, group.name, dateStr, item.notes)
          .catch((err: any) => this.logger.warn(`Davomat xabarnomasi yuborilmadi: ${err.message}`));
      }
    }

    return {
      groupId: dto.groupId,
      date: targetDate,
      savedCount: results.length,
      records: results,
    };
  }

  async getGroupAttendance(groupId: string, date?: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException(`Guruh topilmadi (ID: ${groupId})`);
    }

    const whereClause: any = { groupId };
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      whereClause.date = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    return this.prisma.attendance.findMany({
      where: whereClause,
      include: {
        enrollment: {
          include: { lead: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }
}
