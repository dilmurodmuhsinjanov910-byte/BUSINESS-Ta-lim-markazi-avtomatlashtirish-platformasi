import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

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
