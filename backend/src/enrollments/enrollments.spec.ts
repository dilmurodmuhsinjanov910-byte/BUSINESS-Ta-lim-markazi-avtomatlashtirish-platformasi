import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from './enrollments.service';
import { AttendanceService } from '../attendance/attendance.service';
import { GradesService } from '../grades/grades.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, AttendanceStatus, GradeType } from '@prisma/client';

describe('Enrollment, Attendance & Grades Suite', () => {
  let enrollmentsService: EnrollmentsService;
  let attendanceService: AttendanceService;
  let gradesService: GradesService;

  const mockTelegramService = {
    sendEnrollmentNotification: jest.fn().mockResolvedValue(true),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockPrisma: any = {
    lead: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    group: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    enrollment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    attendance: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    studentGrade: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    leadActivity: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockPrisma);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        AttendanceService,
        GradesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    enrollmentsService = module.get<EnrollmentsService>(EnrollmentsService);
    attendanceService = module.get<AttendanceService>(AttendanceService);
    gradesService = module.get<GradesService>(GradesService);

    jest.clearAllMocks();
  });

  describe('EnrollmentsService', () => {
    it('should successfully enroll student, update lead to WON, increment group count, and send Telegram WebApp notification', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        fullName: 'Ali Valiyev',
        telegramId: '12345678',
        phone: '+998901234567',
      });

      mockPrisma.group.findUnique.mockResolvedValue({
        id: 'group-1',
        name: 'ENG-A1',
        maxStudents: 12,
        currentStudents: 5,
        status: 'RECRUITING',
        daysOfWeek: 'Dush-Chor-Jum',
        startTime: '14:00',
        endTime: '15:20',
        roomNumber: '101',
        course: { name: 'General English', monthlyPrice: 450000 },
        branch: { name: 'Chilonzor' },
      });

      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      const createdEnrollment = {
        id: 'enr-1',
        leadId: 'lead-1',
        groupId: 'group-1',
        monthlyFee: 450000,
        status: EnrollmentStatus.ACTIVE,
        lead: { id: 'lead-1', fullName: 'Ali Valiyev' },
        group: {
          id: 'group-1',
          name: 'ENG-A1',
          course: { name: 'General English' },
          branch: { name: 'Chilonzor' },
        },
      };

      mockPrisma.enrollment.create.mockResolvedValue(createdEnrollment);
      mockPrisma.group.update.mockResolvedValue({ id: 'group-1', currentStudents: 6 });
      mockPrisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'WON' });
      mockPrisma.leadActivity.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await enrollmentsService.createEnrollment({
        leadId: 'lead-1',
        groupId: 'group-1',
      });

      expect(result.id).toBe('enr-1');
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { status: 'WON' },
      });
      expect(mockPrisma.group.update).toHaveBeenCalledWith({
        where: { id: 'group-1' },
        data: { currentStudents: 6, status: 'RECRUITING' },
      });
      expect(mockTelegramService.sendEnrollmentNotification).toHaveBeenCalledWith(
        '12345678',
        'General English',
        'ENG-A1',
        expect.stringContaining('Dush-Chor-Jum'),
        expect.stringContaining('/student?telegramId=12345678'),
      );
    });

    it('should reject enrollment if group capacity is reached', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.group.findUnique.mockResolvedValue({
        id: 'group-1',
        maxStudents: 10,
        currentStudents: 10,
      });

      await expect(
        enrollmentsService.createEnrollment({ leadId: 'lead-1', groupId: 'group-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject enrollment if student is already actively enrolled', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.group.findUnique.mockResolvedValue({
        id: 'group-1',
        maxStudents: 10,
        currentStudents: 2,
        course: { monthlyPrice: 400000 },
      });
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'enr-existing', status: 'ACTIVE' });

      await expect(
        enrollmentsService.createEnrollment({ leadId: 'lead-1', groupId: 'group-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should compute student portal metrics (attendance percentage and average grade)', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        fullName: 'Ali Valiyev',
        telegramId: '12345678',
        payments: [{ id: 'p-1', amount: 450000, status: 'PAID' }],
        enrollments: [
          {
            id: 'enr-1',
            status: 'ACTIVE',
            monthlyFee: 450000,
            enrolledAt: new Date(),
            group: {
              id: 'group-1',
              name: 'ENG-A1',
              daysOfWeek: 'Dush-Chor-Jum',
              startTime: '14:00',
              endTime: '15:20',
              course: { name: 'General English', level: 'Beginner', language: 'Ingliz', monthlyPrice: 450000 },
              branch: { name: 'Chilonzor', address: 'Qatortol', phone: '+998712001122' },
            },
            attendances: [
              { id: 'att-1', status: 'PRESENT', date: new Date() },
              { id: 'att-2', status: 'PRESENT', date: new Date() },
              { id: 'att-3', status: 'LATE', date: new Date() },
              { id: 'att-4', status: 'ABSENT', date: new Date() },
            ],
            grades: [
              { id: 'grd-1', score: 90, maxScore: 100, title: 'Unit 1 Homework' },
              { id: 'grd-2', score: 80, maxScore: 100, title: 'Quiz 1' },
            ],
          },
        ],
      });

      const portal = await enrollmentsService.getStudentPortalData('12345678');
      expect(portal.student.fullName).toBe('Ali Valiyev');
      expect(portal.enrollments.length).toBe(1);
      const enr = portal.enrollments[0];
      expect(enr.stats.totalLessons).toBe(4);
      expect(enr.stats.presentCount).toBe(2);
      expect(enr.stats.lateCount).toBe(1);
      expect(enr.stats.absentCount).toBe(1);
      expect(enr.stats.averageGrade).toBe(85);
      expect(enr.stats.attendancePercentage).toBeGreaterThan(0);
    });
  });

  describe('AttendanceService', () => {
    it('should create attendance records and update if already exists on same date', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({ id: 'group-1', name: 'ENG-A1' });

      // First call finds no existing record -> creates
      mockPrisma.attendance.findFirst.mockResolvedValueOnce(null);
      mockPrisma.attendance.create.mockResolvedValueOnce({
        id: 'att-1',
        enrollmentId: 'enr-1',
        groupId: 'group-1',
        status: AttendanceStatus.PRESENT,
      });

      const result = await attendanceService.recordAttendance({
        groupId: 'group-1',
        date: '2026-09-17',
        records: [{ enrollmentId: 'enr-1', status: AttendanceStatus.PRESENT, notes: "Vaqtida keldi" }],
      });

      expect(result.savedCount).toBe(1);
      expect(mockPrisma.attendance.create).toHaveBeenCalled();

      // Second call finds existing record -> updates
      mockPrisma.attendance.findFirst.mockResolvedValueOnce({
        id: 'att-1',
        enrollmentId: 'enr-1',
        groupId: 'group-1',
        status: AttendanceStatus.PRESENT,
      });
      mockPrisma.attendance.update.mockResolvedValueOnce({
        id: 'att-1',
        status: AttendanceStatus.LATE,
        notes: '15 daqiqa kechikdi',
      });

      const updatedResult = await attendanceService.recordAttendance({
        groupId: 'group-1',
        date: '2026-09-17',
        records: [{ enrollmentId: 'enr-1', status: AttendanceStatus.LATE, notes: '15 daqiqa kechikdi' }],
      });

      expect(updatedResult.savedCount).toBe(1);
      expect(mockPrisma.attendance.update).toHaveBeenCalled();
    });
  });

  describe('GradesService', () => {
    it('should create grade for student enrollment', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        lead: { id: 'lead-1', fullName: 'Ali Valiyev' },
        group: { id: 'group-1', course: { name: 'General English' } },
      });

      mockPrisma.studentGrade.create.mockResolvedValue({
        id: 'grd-1',
        enrollmentId: 'enr-1',
        score: 95,
        maxScore: 100,
        gradeType: GradeType.HOMEWORK,
        title: 'Grammar Unit 3',
      });

      const grade = await gradesService.recordGrade({
        enrollmentId: 'enr-1',
        score: 95,
        title: 'Grammar Unit 3',
        gradeType: GradeType.HOMEWORK,
      });

      expect(grade.id).toBe('grd-1');
      expect(grade.score).toBe(95);
      expect(mockPrisma.studentGrade.create).toHaveBeenCalled();
    });
  });
});
