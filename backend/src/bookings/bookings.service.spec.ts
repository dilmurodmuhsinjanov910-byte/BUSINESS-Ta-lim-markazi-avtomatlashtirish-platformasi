import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, LeadStatus, GroupStatus, Role } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: PrismaService;

  const mockPrisma = {
    lead: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    group: {
      findUnique: jest.fn(),
    },
    trialBooking: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    reminder: {
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
    followUp: {
      create: jest.fn(),
    },
    leadActivity: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createBooking - Capacity limits', () => {
    it('should reject booking if group capacity is reached (currentStudents >= maxStudents)', async () => {
      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue({ id: 'lead-1', score: 50 });
      (mockPrisma.group.findUnique as jest.Mock).mockResolvedValue({
        id: 'group-full',
        name: 'ENG-FULL',
        currentStudents: 12,
        maxStudents: 12,
        status: GroupStatus.FULL,
      });

      await expect(
        service.createBooking({
          leadId: 'lead-1',
          groupId: 'group-full',
          bookingDate: new Date().toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject booking if lead already has an active trial booking for this group', async () => {
      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue({ id: 'lead-1', score: 50 });
      (mockPrisma.group.findUnique as jest.Mock).mockResolvedValue({
        id: 'group-1',
        name: 'ENG-1',
        currentStudents: 5,
        maxStudents: 12,
        status: GroupStatus.RECRUITING,
      });
      (mockPrisma.trialBooking.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-booking',
        status: BookingStatus.BOOKED,
      });

      await expect(
        service.createBooking({
          leadId: 'lead-1',
          groupId: 'group-1',
          bookingDate: new Date().toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create booking and schedule automated reminders', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h in future
      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue({ id: 'lead-1', score: 50 });
      (mockPrisma.group.findUnique as jest.Mock).mockResolvedValue({
        id: 'group-1',
        name: 'ENG-1',
        branchId: 'branch-1',
        startTime: '10:00',
        endTime: '11:20',
        currentStudents: 5,
        maxStudents: 12,
        status: GroupStatus.RECRUITING,
      });
      (mockPrisma.trialBooking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.trialBooking.create as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        leadId: 'lead-1',
        groupId: 'group-1',
        bookingDate: futureDate,
        status: BookingStatus.BOOKED,
      });

      const result = await service.createBooking({
        leadId: 'lead-1',
        groupId: 'group-1',
        bookingDate: futureDate.toISOString(),
      });

      expect(result.id).toBe('booking-1');
      expect(mockPrisma.reminder.createMany).toHaveBeenCalled();
      expect(mockPrisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          data: expect.objectContaining({
            status: LeadStatus.TRIAL_BOOKED,
          }),
        }),
      );
    });
  });

  describe('updateStatus - ATTENDED to MISSED restriction', () => {
    it('should reject reverting ATTENDED to MISSED if performed by a regular ADMIN', async () => {
      (mockPrisma.trialBooking.findUnique as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.ATTENDED,
        leadId: 'lead-1',
        lead: { id: 'lead-1', score: 80 },
      });

      const regularAdmin = { id: 'user-admin', role: Role.ADMIN, fullName: 'Admin User' };

      await expect(
        service.updateStatus('booking-1', BookingStatus.MISSED, 'Reason', regularAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow reverting ATTENDED to MISSED for SUPER_ADMIN with required reason and write audit log', async () => {
      (mockPrisma.trialBooking.findUnique as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.ATTENDED,
        leadId: 'lead-1',
        lead: { id: 'lead-1', score: 80 },
      });
      (mockPrisma.trialBooking.update as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.MISSED,
      });

      const superAdmin = { id: 'user-super', role: Role.SUPER_ADMIN, fullName: 'Bosh Admin' };

      const result = await service.updateStatus('booking-1', BookingStatus.MISSED, 'Adashib kiritilgan', superAdmin);

      expect(result.status).toBe(BookingStatus.MISSED);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'TrialBooking',
            action: 'STATUS_REVERSION_ATTENDED_TO_MISSED',
          }),
        }),
      );
    });
  });

  describe('Cancellation cancels pending reminders', () => {
    it('should cancel all pending reminders when trial booking is cancelled', async () => {
      (mockPrisma.trialBooking.findUnique as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.BOOKED,
        leadId: 'lead-1',
        lead: { id: 'lead-1', score: 50 },
      });
      (mockPrisma.trialBooking.update as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.CANCELLED,
      });

      await service.updateStatus('booking-1', BookingStatus.CANCELLED, 'Mijoz rejalari o\'zgardi');

      expect(mockPrisma.reminder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookingId: 'booking-1', status: 'PENDING' },
          data: { status: 'CANCELLED' },
        }),
      );
    });
  });
});
