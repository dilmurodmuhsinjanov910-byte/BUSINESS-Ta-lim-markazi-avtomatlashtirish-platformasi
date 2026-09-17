import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, LeadStatus, ReminderType, ReminderStatus, GroupStatus, Role } from '@prisma/client';

import { CreateBookingDto } from './dto/create-booking.dto';

export { CreateBookingDto };

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    branchId?: string;
    groupId?: string;
    status?: BookingStatus;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};
    if (params?.branchId) where.branchId = params.branchId;
    if (params?.groupId) where.groupId = params.groupId;
    if (params?.status) where.status = params.status;
    if (params?.startDate || params?.endDate) {
      where.bookingDate = {};
      if (params.startDate) where.bookingDate.gte = new Date(params.startDate);
      if (params.endDate) where.bookingDate.lte = new Date(params.endDate);
    }

    return this.prisma.trialBooking.findMany({
      where,
      include: {
        lead: true,
        group: {
          include: { course: true },
        },
        branch: true,
        reminders: true,
        followUps: true,
      },
      orderBy: { bookingDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.trialBooking.findUnique({
      where: { id },
      include: {
        lead: true,
        group: {
          include: { course: true },
        },
        branch: true,
        reminders: true,
        followUps: true,
      },
    });

    if (!booking) throw new NotFoundException('Sinov darsi bron topilmadi');
    return booking;
  }

  async createBooking(dto: CreateBookingDto, createdById?: string) {
    // 1. Verify lead exists
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });
    if (!lead) throw new NotFoundException('Lead topilmadi');

    // 2. Verify group exists and check capacity limit strictly
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      include: { branch: true },
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    if (group.status === GroupStatus.FULL || group.currentStudents >= group.maxStudents) {
      throw new BadRequestException(
        `Ushbu guruh to'lgan (${group.currentStudents}/${group.maxStudents} talaba). Sinov darsini bron qilish mumkin emas.`,
      );
    }

    if (group.status === GroupStatus.ARCHIVED) {
      throw new BadRequestException('Ushbu guruh arxivlangan.');
    }

    const bookingDate = new Date(dto.bookingDate);
    if (isNaN(bookingDate.getTime())) {
      throw new BadRequestException("Noto'g'ri sana kiritildi.");
    }

    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Count existing active trial bookings for this group on the same day
    const activeDateBookings = await this.prisma.trialBooking.count({
      where: {
        groupId: dto.groupId,
        bookingDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: [BookingStatus.BOOKED, BookingStatus.CONFIRMED] },
      },
    });

    if (group.currentStudents + activeDateBookings >= group.maxStudents) {
      throw new BadRequestException(
        `Ushbu guruh va tanlangan sana uchun barcha o'rinlar band qilingan (${group.currentStudents + activeDateBookings}/${group.maxStudents} ta). Sinov darsini bron qilish mumkin emas.`,
      );
    }

    // 3. De-duplication check: check if lead already has active trial booking for this group
    const activeBooking = await this.prisma.trialBooking.findFirst({
      where: {
        leadId: dto.leadId,
        groupId: dto.groupId,
        status: { in: [BookingStatus.BOOKED, BookingStatus.CONFIRMED] },
      },
    });

    if (activeBooking) {
      throw new BadRequestException(
        'Ushbu mijozda mazkur guruh uchun faol sinov darsi bron mavjud!',
      );
    }

    const timeSlot = `${group.startTime} - ${group.endTime}`;

    // 4. Create Trial Booking
    const booking = await this.prisma.trialBooking.create({
      data: {
        leadId: dto.leadId,
        groupId: dto.groupId,
        branchId: group.branchId,
        bookingDate,
        timeSlot,
        status: BookingStatus.BOOKED,
      },
    });

    // 5. Update Lead status and score
    const newScore = Math.min(100, lead.score + 25);
    const newTier = newScore >= 70 ? 'HOT' : newScore >= 40 ? 'WARM' : 'COLD';

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: LeadStatus.TRIAL_BOOKED,
        score: newScore,
        scoreTier: newTier as any,
        preferredBranchId: group.branchId,
      },
    });

    // Record activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'TRIAL_BOOKED',
        title: 'Sinov darsi bron qilindi',
        description: `Guruh: ${group.name}, Sana: ${bookingDate.toLocaleDateString()}, Vaqt: ${timeSlot}. Ball: ${lead.score} -> ${newScore}`,
        createdById,
      },
    });

    // 6. Schedule Automated Reminders: 24h before and 2h before
    await this.scheduleRemindersForBooking(booking.id, lead.id, bookingDate);

    // Record system audit log
    if (this.prisma.auditLog?.create) {
      try {
        await this.prisma.auditLog.create({
          data: {
            entityType: 'TrialBooking',
            entityId: booking.id,
            action: 'CREATE_BOOKING',
            changedById: createdById,
            newValue: JSON.stringify({ leadId: dto.leadId, groupId: dto.groupId, bookingDate }),
            reason: 'Yangi sinov darsi bron qilindi',
          },
        });
      } catch (e) {}
    }

    return booking;
  }

  private async scheduleRemindersForBooking(bookingId: string, leadId: string, bookingDate: Date) {
    const now = new Date();
    const time24hBefore = new Date(bookingDate.getTime() - 24 * 60 * 60 * 1000);
    const time2hBefore = new Date(bookingDate.getTime() - 2 * 60 * 60 * 1000);

    const remindersData: any[] = [];

    if (time24hBefore > now) {
      remindersData.push({
        bookingId,
        leadId,
        scheduledAt: time24hBefore,
        reminderType: ReminderType.BEFORE_24H,
        channel: 'TELEGRAM',
        status: ReminderStatus.PENDING,
      });
    }

    if (time2hBefore > now) {
      remindersData.push({
        bookingId,
        leadId,
        scheduledAt: time2hBefore,
        reminderType: ReminderType.BEFORE_2H,
        channel: 'TELEGRAM',
        status: ReminderStatus.PENDING,
      });
    }

    if (remindersData.length > 0) {
      await this.prisma.reminder.createMany({
        data: remindersData,
      });
    }
  }

  // Status transition engine with strict ATTENDED -> MISSED prevention and audit logging
  async updateStatus(
    id: string,
    newStatus: BookingStatus,
    reason?: string,
    currentUser?: { id: string; role: Role; fullName: string },
  ) {
    const booking = await this.findOne(id);
    const oldStatus = booking.status;

    // Strict Rule: ATTENDED cannot revert to MISSED without authorized admin + audit log
    if (oldStatus === BookingStatus.ATTENDED && newStatus === BookingStatus.MISSED) {
      if (!currentUser || (currentUser.role !== Role.SUPER_ADMIN && currentUser.role !== Role.OWNER)) {
        throw new ForbiddenException(
          'Darsga qatnashgan (ATTENDED) holatni dars qoldirdi (MISSED) ga qaytarish faqat Bosh Administrator ruxsati bilan mumkin!',
        );
      }

      if (!reason || !reason.trim()) {
        throw new BadRequestException('ATTENDED holatni o\'zgartirish uchun asosli sabab kiritilishi shart!');
      }

      // Record strict audit log
      if (this.prisma.auditLog?.create) {
        try {
          await this.prisma.auditLog.create({
            data: {
              entityType: 'TrialBooking',
              entityId: id,
              action: 'STATUS_REVERSION_ATTENDED_TO_MISSED',
              changedById: currentUser.id,
              oldValue: JSON.stringify({ status: oldStatus }),
              newValue: JSON.stringify({ status: newStatus }),
              reason,
            },
          });
        } catch (e) {}
      }
    }

    // Handle cancellation: cancel all pending reminders
    if (newStatus === BookingStatus.CANCELLED) {
      await this.prisma.reminder.updateMany({
        where: {
          bookingId: id,
          status: ReminderStatus.PENDING,
        },
        data: {
          status: ReminderStatus.CANCELLED,
        },
      });
    }

    // Update booking
    const updated = await this.prisma.trialBooking.update({
      where: { id },
      data: {
        status: newStatus,
        attendedAt: newStatus === BookingStatus.ATTENDED ? new Date() : booking.attendedAt,
        attendedBy: newStatus === BookingStatus.ATTENDED ? currentUser?.fullName : booking.attendedBy,
        missedReason: newStatus === BookingStatus.MISSED ? reason : booking.missedReason,
        cancellationReason: newStatus === BookingStatus.CANCELLED ? reason : booking.cancellationReason,
      },
    });

    // Update lead lifecycle & score accordingly
    if (newStatus === BookingStatus.ATTENDED) {
      await this.prisma.lead.update({
        where: { id: booking.leadId },
        data: {
          status: LeadStatus.TRIAL_ATTENDED,
          score: Math.min(100, booking.lead.score + 20),
        },
      });

      await this.prisma.leadActivity.create({
        data: {
          leadId: booking.leadId,
          type: 'STATUS_CHANGE',
          title: 'Sinov darsiga qatnashdi',
          description: `O'quvchi sinov darsida muvaffaqiyatli ishtirok etdi. Qabul qiluvchi: ${currentUser?.fullName || 'Admin'}`,
          createdById: currentUser?.id,
        },
      });
    } else if (newStatus === BookingStatus.MISSED) {
      // Trigger Follow-up flow for missed trials
      await this.initiateMissedTrialFollowUps(booking.id, booking.leadId);

      await this.prisma.lead.update({
        where: { id: booking.leadId },
        data: {
          score: Math.max(0, booking.lead.score - 15),
        },
      });

      await this.prisma.leadActivity.create({
        data: {
          leadId: booking.leadId,
          type: 'STATUS_CHANGE',
          title: 'Sinov darsiga kelmadi (MISSED)',
          description: `Sabab: ${reason || 'Sabab ko\'rsatilmadi'}. Avtomatik follow-up rejalashtirildi.`,
          createdById: currentUser?.id,
        },
      });
    }

    // Record system audit log
    if (this.prisma.auditLog?.create) {
      try {
        await this.prisma.auditLog.create({
          data: {
            entityType: 'TrialBooking',
            entityId: id,
            action: `STATUS_CHANGE_${newStatus}`,
            changedById: currentUser?.id,
            oldValue: JSON.stringify({ status: oldStatus }),
            newValue: JSON.stringify({ status: newStatus }),
            reason: reason || `Sinov darsi holati: ${oldStatus} -> ${newStatus}`,
          },
        });
      } catch (e) {}
    }

    return updated;
  }

  // Non-spam follow-up sequence initiation for missed trials (+2h and +24h)
  private async initiateMissedTrialFollowUps(bookingId: string, leadId: string) {
    const now = new Date();
    const plus2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const plus24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Sequence 1: +2h
    await this.prisma.followUp.create({
      data: {
        bookingId,
        leadId,
        sequence: 1,
        scheduledAt: plus2h,
        status: 'PENDING',
        messageText: "Assalomu alaykum! Bugun sinov darsimizda qatnasha olmadingiz. Sizga boshqa qulay vaqtga ko'chirib beraylikmi?",
      },
    });

    // Sequence 2: +24h
    await this.prisma.followUp.create({
      data: {
        bookingId,
        leadId,
        sequence: 2,
        scheduledAt: plus24h,
        status: 'PENDING',
        messageText: "Salom! Ingliz tili kursi bo'yicha sizga joyingizni saqlab qo'yganmiz. Ertaga guruhga qo'shilishni xohlaysizmi?",
      },
    });
  }
}
