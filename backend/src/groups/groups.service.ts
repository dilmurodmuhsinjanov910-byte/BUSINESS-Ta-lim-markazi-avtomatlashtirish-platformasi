import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupStatus } from '@prisma/client';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { branchId?: string; courseId?: string; status?: GroupStatus }) {
    const where: any = {};
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.courseId) where.courseId = query.courseId;
    if (query?.status) where.status = query.status;

    return this.prisma.group.findMany({
      where,
      include: {
        course: true,
        branch: true,
        _count: {
          select: { trialBookings: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        course: true,
        branch: true,
        trialBookings: {
          include: { lead: true },
          orderBy: { bookingDate: 'desc' },
          take: 10,
        },
      },
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    return group;
  }

  async findAvailableForTrial(branchId?: string, courseId?: string) {
    const where: any = {
      status: { in: [GroupStatus.RECRUITING, GroupStatus.ACTIVE] },
    };
    if (branchId) where.branchId = branchId;
    if (courseId) where.courseId = courseId;

    const groups = await this.prisma.group.findMany({
      where,
      include: {
        course: true,
        branch: true,
      },
      orderBy: { name: 'asc' },
    });

    // Filter strictly by capacity: currentStudents < maxStudents
    return groups
      .filter((g) => g.currentStudents < g.maxStudents)
      .map((g) => ({
        id: g.id,
        name: g.name,
        courseName: g.course.name,
        branchName: g.branch.name,
        branchAddress: g.branch.address,
        daysOfWeek: g.daysOfWeek,
        timeSlot: `${g.startTime} - ${g.endTime}`,
        availableSeats: g.maxStudents - g.currentStudents,
        maxStudents: g.maxStudents,
        currentStudents: g.currentStudents,
      }));
  }

  async canBookTrial(groupId: string): Promise<{ canBook: boolean; reason?: string; group?: any }> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { course: true, branch: true },
    });

    if (!group) {
      return { canBook: false, reason: 'Guruh topilmadi' };
    }

    if (group.status === GroupStatus.FULL || group.currentStudents >= group.maxStudents) {
      return { canBook: false, reason: 'Guruh to\'lgan, sinov darsi uchun joy mavjud emas', group };
    }

    if (group.status === GroupStatus.ARCHIVED) {
      return { canBook: false, reason: 'Guruh faoliyatini yakunlagan', group };
    }

    return { canBook: true, group };
  }

  async create(data: {
    name: string;
    courseId: string;
    branchId: string;
    teacherId?: string;
    daysOfWeek: string;
    startTime: string;
    endTime: string;
    roomNumber?: string;
    maxStudents?: number;
    currentStudents?: number;
    status?: GroupStatus;
  }) {
    return this.prisma.group.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.group.update({
      where: { id },
      data,
    });
  }

  async incrementStudents(id: string, amount = 1) {
    const group = await this.findOne(id);
    const newCount = group.currentStudents + amount;
    const isFull = newCount >= group.maxStudents;

    return this.prisma.group.update({
      where: { id },
      data: {
        currentStudents: newCount,
        status: isFull ? GroupStatus.FULL : group.status,
      },
    });
  }
}
