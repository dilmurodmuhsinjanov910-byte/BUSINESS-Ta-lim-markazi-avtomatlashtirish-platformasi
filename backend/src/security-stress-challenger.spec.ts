import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { TelegramService } from './telegram/telegram.service';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import {
  Role,
  AttendanceStatus,
  GradeType,
  EnrollmentStatus,
  PaymentMethod,
  PaymentStatus,
  GroupStatus,
} from '@prisma/client';

describe('EMPIRICAL CHALLENGER: Stress Testing on IDOR, Boundaries, Markers & Financial RBAC', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let superAdminToken: string;
  let adminToken: string;
  let teacherAToken: string;
  let teacherBToken: string;
  let operatorToken: string;
  let accountantToken: string;

  const users = {
    superAdmin: {
      id: 'challenger-user-superadmin',
      email: 'superadmin@challenger.uz',
      fullName: 'Super Admin',
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
    admin: {
      id: 'challenger-user-admin',
      email: 'admin@challenger.uz',
      fullName: 'Branch Admin',
      role: Role.ADMIN,
      isActive: true,
    },
    teacherA: {
      id: 'challenger-teacher-a',
      email: 'teachera@challenger.uz',
      fullName: 'Teacher A (Math)',
      role: Role.TEACHER,
      isActive: true,
      telegramId: 'tg-challenger-teacher-a',
    },
    teacherB: {
      id: 'challenger-teacher-b',
      email: 'teacherb@challenger.uz',
      fullName: 'Teacher B (Physics)',
      role: Role.TEACHER,
      isActive: true,
      telegramId: 'tg-challenger-teacher-b',
    },
    operator: {
      id: 'challenger-user-operator',
      email: 'operator@challenger.uz',
      fullName: 'Support Operator',
      role: Role.OPERATOR,
      isActive: true,
    },
    accountant: {
      id: 'challenger-user-accountant',
      email: 'accountant@challenger.uz',
      fullName: 'Financial Accountant',
      role: Role.ACCOUNTANT,
      isActive: true,
    },
  };

  const groups = {
    groupA: {
      id: 'group-teacher-a',
      name: 'MATH-101',
      courseId: 'course-1',
      branchId: 'branch-1',
      teacherId: 'challenger-teacher-a',
      maxStudents: 15,
      currentStudents: 2,
      status: GroupStatus.ACTIVE,
      daysOfWeek: 'Dush-Chor-Jum',
      startTime: '09:00',
      endTime: '10:30',
      roomNumber: '101',
      course: { id: 'course-1', name: 'Mathematics', monthlyPrice: 500000 },
      branch: { id: 'branch-1', name: 'Main Branch', address: 'Navoiy 1', phone: '+998711112233' },
    },
    groupB: {
      id: 'group-teacher-b',
      name: 'PHYS-202',
      courseId: 'course-2',
      branchId: 'branch-1',
      teacherId: 'challenger-teacher-b',
      maxStudents: 15,
      currentStudents: 2,
      status: GroupStatus.ACTIVE,
      daysOfWeek: 'Sesh-Pay-Shan',
      startTime: '14:00',
      endTime: '15:30',
      roomNumber: '202',
      course: { id: 'course-2', name: 'Physics', monthlyPrice: 550000 },
      branch: { id: 'branch-1', name: 'Main Branch', address: 'Navoiy 1', phone: '+998711112233' },
    },
  };

  const enrollments = {
    enrollmentStudentA: {
      id: 'enr-student-a',
      leadId: 'lead-student-a',
      groupId: 'group-teacher-a',
      status: EnrollmentStatus.ACTIVE,
      monthlyFee: 500000,
      enrolledAt: new Date('2026-09-01'),
      lead: { id: 'lead-student-a', fullName: 'Student in Group A', phone: '+998901111111' },
      group: groups.groupA,
    },
    enrollmentStudentB: {
      id: 'enr-student-b',
      leadId: 'lead-student-b',
      groupId: 'group-teacher-b',
      status: EnrollmentStatus.ACTIVE,
      monthlyFee: 550000,
      enrolledAt: new Date('2026-09-01'),
      lead: { id: 'lead-student-b', fullName: 'Student in Group B', phone: '+998902222222' },
      group: groups.groupB,
    },
  };

  const payments = {
    payment1: {
      id: 'pay-challenger-1',
      leadId: 'lead-student-a',
      amount: 500000,
      currency: 'UZS',
      status: PaymentStatus.PAID,
      method: PaymentMethod.CLICK,
      paidAt: new Date('2026-09-01'),
      createdAt: new Date('2026-09-01'),
      notes: 'Initial fee',
      recordedById: 'challenger-user-superadmin',
      lead: {
        id: 'lead-student-a',
        fullName: 'Student in Group A',
        phone: '+998901111111',
        telegramId: 'tg-lead-a',
        preferredCourse: 'Mathematics',
        preferredBranch: { name: 'Main Branch' },
        enrollments: [
          {
            group: {
              name: 'MATH-101',
              course: { name: 'Mathematics' },
              branch: { name: 'Main Branch' },
            },
          },
        ],
      },
    },
  };

  const teacherMessages = [
    {
      id: 'msg-challenger-1',
      teacherId: 'challenger-teacher-a',
      senderRole: 'TEACHER',
      content: 'Teacher A secret message',
      isRead: true,
      createdAt: new Date(),
    },
    {
      id: 'msg-challenger-2',
      teacherId: 'challenger-teacher-b',
      senderRole: 'TEACHER',
      content: 'Teacher B secret message',
      isRead: false,
      createdAt: new Date(),
    },
  ];

  let lastCreatedAttendance: any = null;
  let lastCreatedGrade: any = null;

  const mockPrisma: any = {
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where?.id) {
          const user = Object.values(users).find((u) => u.id === where.id);
          return Promise.resolve(user ? { ...user, branch: null } : null);
        }
        if (where?.email) {
          const user = Object.values(users).find((u) => u.email === where.email);
          return Promise.resolve(user ? { ...user, branch: null } : null);
        }
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where?.id) {
          const user = Object.values(users).find((u) => u.id === where.id);
          return Promise.resolve(user ? { ...user, branch: null } : null);
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockImplementation(() => Promise.resolve(Object.values(users))),
    },
    group: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const g = Object.values(groups).find((grp) => grp.id === where.id);
        if (!g) return Promise.resolve(null);
        return Promise.resolve({ ...g, course: g.course, branch: g.branch, trialBookings: [] });
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        let list = Object.values(groups);
        if (where?.teacherId) {
          list = list.filter((g) => g.teacherId === where.teacherId);
        }
        return Promise.resolve(
          list.map((g) => ({
            ...g,
            course: g.course,
            branch: g.branch,
            enrollments: Object.values(enrollments)
              .filter((e) => e.groupId === g.id)
              .map((e) => ({ ...e, lead: e.lead, attendances: [], grades: [] })),
          })),
        );
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const g = Object.values(groups).find((grp) => grp.id === where.id);
        return Promise.resolve({ ...g, ...data });
      }),
    },
    enrollment: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const e = Object.values(enrollments).find((enr) => enr.id === where.id);
        return Promise.resolve(e ? { ...e, group: e.group } : null);
      }),
      findMany: jest.fn().mockResolvedValue([enrollments.enrollmentStudentA]),
    },
    attendance: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => {
        lastCreatedAttendance = { id: `att-${Date.now()}`, ...data };
        return Promise.resolve({
          ...lastCreatedAttendance,
          enrollment: enrollments.enrollmentStudentA,
        });
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        lastCreatedAttendance = { id: 'att-updated', ...data };
        return Promise.resolve({ ...lastCreatedAttendance, enrollment: enrollments.enrollmentStudentA });
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    studentGrade: {
      create: jest.fn().mockImplementation(({ data }) => {
        lastCreatedGrade = { id: `grd-${Date.now()}`, ...data };
        return Promise.resolve({
          ...lastCreatedGrade,
          enrollment: enrollments.enrollmentStudentA,
        });
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    teacherMessage: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(teacherMessages.filter((m) => m.teacherId === where?.teacherId));
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        return Promise.resolve({
          id: `msg-${Date.now()}`,
          ...data,
          isRead: false,
          createdAt: new Date(),
        });
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    payment: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where?.id === 'pay-challenger-1') {
          return Promise.resolve(payments.payment1);
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue([payments.payment1]),
      create: jest.fn().mockImplementation(({ data }) => {
        return Promise.resolve({
          id: `pay-${Date.now()}`,
          ...data,
          status: PaymentStatus.PENDING,
          createdAt: new Date(),
          lead: { id: data.leadId, fullName: 'Student', telegramId: 'tg-lead-a' },
        });
      }),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...payments.payment1, ...data })),
      count: jest.fn().mockResolvedValue(1),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500000 } }),
    },
    lead: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where?.id === 'lead-student-a') {
          return Promise.resolve({ id: 'lead-student-a', fullName: 'Student in Group A', phone: '+998901111111' });
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'lead-student-a', status: 'WON' }),
    },
    leadActivity: {
      create: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockImplementation(async (callback: any) => callback(mockPrisma)),
  };

  const mockTelegram = {
    sendAttendanceAlert: jest.fn().mockResolvedValue(true),
    sendGradeAlert: jest.fn().mockResolvedValue(true),
    sendPaymentReceiptAlert: jest.fn().mockResolvedValue(true),
    sendPaymentReminderAlert: jest.fn().mockResolvedValue(true),
    sendEnrollmentNotification: jest.fn().mockResolvedValue(true),
    sendMessageToTelegramUser: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TelegramService)
      .useValue(mockTelegram)
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    superAdminToken = jwtService.sign({
      sub: users.superAdmin.id,
      email: users.superAdmin.email,
      role: users.superAdmin.role,
    });

    adminToken = jwtService.sign({
      sub: users.admin.id,
      email: users.admin.email,
      role: users.admin.role,
    });

    teacherAToken = jwtService.sign({
      sub: users.teacherA.id,
      email: users.teacherA.email,
      role: users.teacherA.role,
    });

    teacherBToken = jwtService.sign({
      sub: users.teacherB.id,
      email: users.teacherB.email,
      role: users.teacherB.role,
    });

    operatorToken = jwtService.sign({
      sub: users.operator.id,
      email: users.operator.email,
      role: users.operator.role,
    });

    accountantToken = jwtService.sign({
      sub: users.accountant.id,
      email: users.accountant.email,
      role: users.accountant.role,
    });

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    RateLimitGuard.resetStorage();
    RateLimitGuard.bypassInTests = true;
    await app.close();
  });

  beforeEach(() => {
    lastCreatedAttendance = null;
    lastCreatedGrade = null;
    jest.clearAllMocks();
  });

  // =========================================================================
  // Challenge 1: IDOR & Cross-Teacher Query Param Tampering
  // =========================================================================
  describe('Challenge 1: IDOR on Teacher Roster Endpoint (GET /api/enrollments/teacher)', () => {
    it('ATTACK: Teacher A passes ?teacherId=challenger-teacher-b -> MUST NOT reveal Teacher B roster', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/enrollments/teacher?teacherId=challenger-teacher-b')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      // Verify locked identity
      expect(res.body.teacherIdentifier).toBe(users.teacherA.id);
      expect(res.body.teacherIdentifier).not.toBe(users.teacherB.id);

      // Verify that groups only belong to Teacher A
      const groupIds = res.body.groups.map((g: any) => g.id);
      expect(groupIds).toContain('group-teacher-a');
      expect(groupIds).not.toContain('group-teacher-b');
    });

    it('ATTACK: Teacher A passes HTTP Parameter Pollution (?teacherId=B&teacherId=A) -> MUST NOT reveal Teacher B', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/enrollments/teacher?teacherId=challenger-teacher-b&teacherId=challenger-teacher-a')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.teacherIdentifier).toBe(users.teacherA.id);
      const groupIds = res.body.groups.map((g: any) => g.id);
      expect(groupIds).toContain('group-teacher-a');
      expect(groupIds).not.toContain('group-teacher-b');
    });

    it('ATTACK: Teacher A passes URL-encoded ?teacherId=%63%68%61%6c... -> MUST NOT reveal Teacher B', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/enrollments/teacher?teacherId=%63%68%61%6c%6c%65%6e%67%65%72%2d%74%65%61%63%68%65%72%2d%62')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.teacherIdentifier).toBe(users.teacherA.id);
      const groupIds = res.body.groups.map((g: any) => g.id);
      expect(groupIds).not.toContain('group-teacher-b');
    });

    it('CONTROL: Admin requesting ?teacherId=challenger-teacher-b MUST successfully retrieve Teacher B roster', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/enrollments/teacher?teacherId=challenger-teacher-b')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.teacherIdentifier).toBe(users.teacherB.id);
      const groupIds = res.body.groups.map((g: any) => g.id);
      expect(groupIds).toContain('group-teacher-b');
    });
  });

  // =========================================================================
  // Challenge 2: Cross-Teacher Message Thread Spoofing & Snooping
  // =========================================================================
  describe('Challenge 2: Cross-Teacher Messages Boundary Isolation', () => {
    it('ATTACK: Teacher A reading Teacher B private messages GET /api/teacher-messages/challenger-teacher-b -> MUST return 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/teacher-messages/challenger-teacher-b')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/boshqa o'qituvchining xabarlariga kira olmaysiz/i);
    });

    it('ATTACK: Teacher A posting message in Teacher B private thread POST /api/teacher-messages/challenger-teacher-b/send -> MUST return 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/teacher-messages/challenger-teacher-b/send')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({ content: 'Rogue message impersonating Teacher B' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/boshqa o'qituvchining xabarlariga kira olmaysiz/i);
    });

    it('ATTACK: Teacher A accessing GET /api/teacher-messages/conversations -> MUST return 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/teacher-messages/conversations')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(403);
    });

    it('ATTACK: Teacher A attempting admin reply POST /api/teacher-messages/challenger-teacher-b/reply -> MUST return 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/teacher-messages/challenger-teacher-b/reply')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({ content: 'Unauthorized admin reply' });

      expect(res.status).toBe(403);
    });

    it('LEGITIMATE: Teacher A accessing own messages GET /api/teacher-messages/challenger-teacher-a -> MUST return 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/teacher-messages/challenger-teacher-a')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].teacherId).toBe(users.teacherA.id);
    });
  });

  // =========================================================================
  // Challenge 3: Marker ID Spoofing & Cross-Group Integrity (Attendance)
  // =========================================================================
  describe('Challenge 3: Attendance Marker ID Spoofing & Cross-Group Boundary', () => {
    it('ATTACK: Teacher A attempts to spoof markedById to Admin on POST /api/attendance -> MUST be overwritten with Teacher A ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/attendance')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          groupId: 'group-teacher-a',
          date: '2026-09-18',
          markedById: 'challenger-user-superadmin', // SPOOF ATTEMPT
          records: [
            {
              enrollmentId: 'enr-student-a',
              status: AttendanceStatus.PRESENT,
              notes: 'Marker integrity test',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(lastCreatedAttendance).toBeDefined();
      // Verifying markedById was strictly rewritten to caller
      expect(lastCreatedAttendance.markedById).toBe(users.teacherA.id);
      expect(lastCreatedAttendance.markedById).not.toBe('challenger-user-superadmin');
    });

    it('ATTACK: Teacher A attempts to record attendance for Teacher B group -> MUST return 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/attendance')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          groupId: 'group-teacher-b', // Belongs to Teacher B
          date: '2026-09-18',
          records: [
            {
              enrollmentId: 'enr-student-b',
              status: AttendanceStatus.PRESENT,
            },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/faqat o'zingizga biriktirilgan guruh/i);
    });

    it('ATTACK: Teacher A attempts to record attendance for Student B inside Group A -> MUST return 400 Bad Request', async () => {
      // enr-student-b belongs to group-teacher-b, not group-teacher-a
      const res = await request(app.getHttpServer())
        .post('/api/attendance')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          groupId: 'group-teacher-a',
          date: '2026-09-18',
          records: [
            {
              enrollmentId: 'enr-student-b',
              status: AttendanceStatus.PRESENT,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/tegishli emas/i);
    });
  });

  // =========================================================================
  // Challenge 4: Marker ID Spoofing & Cross-Group Integrity (Grades)
  // =========================================================================
  describe('Challenge 4: Grade Marker ID Spoofing & Cross-Group Boundary', () => {
    it('ATTACK: Teacher A attempts to spoof markedById to Admin on POST /api/grades -> MUST be overwritten with Teacher A ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/grades')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          enrollmentId: 'enr-student-a',
          groupId: 'group-teacher-a',
          score: 95,
          title: 'Calculus Quiz',
          markedById: 'challenger-user-superadmin', // SPOOF ATTEMPT
        });

      expect(res.status).toBe(201);
      expect(lastCreatedGrade).toBeDefined();
      expect(lastCreatedGrade.markedById).toBe(users.teacherA.id);
      expect(lastCreatedGrade.markedById).not.toBe('challenger-user-superadmin');
    });

    it('ATTACK: Teacher A attempts to grade Student B (Teacher B group) -> MUST return 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/grades')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          enrollmentId: 'enr-student-b', // Student in Physics (Teacher B)
          score: 90,
          title: 'Unauthorized Cross-Teacher Grading',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/faqat o'zingizga biriktirilgan guruh/i);
    });

    it('ATTACK: Teacher A attempts to grade Student B claiming groupId is Group A -> MUST return 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/grades')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          enrollmentId: 'enr-student-b',
          groupId: 'group-teacher-a', // Tampered group ID
          score: 85,
          title: 'Mismatch Grade Attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/tegishli emas/i);
    });
  });

  // =========================================================================
  // Challenge 5: Financial RBAC Adversarial Sweep
  // =========================================================================
  describe('Challenge 5: Financial RBAC Access Control Sweep', () => {
    const endpoints = [
      { method: 'get', path: '/api/payments' },
      { method: 'get', path: '/api/payments/summary' },
      { method: 'get', path: '/api/payments/debtors' },
      { method: 'get', path: '/api/payments/pay-challenger-1' },
      { method: 'get', path: '/api/payments/pay-challenger-1/receipt' },
      {
        method: 'post',
        path: '/api/payments',
        body: { leadId: 'lead-student-a', amount: 500000, method: PaymentMethod.CASH },
      },
      {
        method: 'post',
        path: '/api/payments/direct-pay',
        body: { leadId: 'lead-student-a', amount: 500000, method: PaymentMethod.CLICK },
      },
      {
        method: 'post',
        path: '/api/payments/notify-debtor/lead-student-a',
        body: {},
      },
      {
        method: 'put',
        path: '/api/payments/pay-challenger-1/pay',
        body: {},
      },
    ];

    describe('5.1 Unauthenticated requests to all financial endpoints -> MUST return 401 Unauthorized', () => {
      endpoints.forEach(({ method, path, body }) => {
        it(`${method.toUpperCase()} ${path} unauthenticated -> 401`, async () => {
          let req: any;
          if (method === 'get') req = request(app.getHttpServer()).get(path);
          if (method === 'post') req = request(app.getHttpServer()).post(path).send(body);
          if (method === 'put') req = request(app.getHttpServer()).put(path).send(body);

          const res = await req;
          expect(res.status).toBe(401);
        });
      });
    });

    describe('5.2 TEACHER role requests to all financial endpoints -> MUST return 403 Forbidden', () => {
      endpoints.forEach(({ method, path, body }) => {
        it(`${method.toUpperCase()} ${path} as TEACHER -> 403`, async () => {
          let req: any;
          if (method === 'get') req = request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${teacherAToken}`);
          if (method === 'post') req = request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${teacherAToken}`).send(body);
          if (method === 'put') req = request(app.getHttpServer()).put(path).set('Authorization', `Bearer ${teacherAToken}`).send(body);

          const res = await req;
          expect(res.status).toBe(403);
          expect(res.body.message).toMatch(/yetarli ruxsat yo'q/i);
        });
      });
    });

    describe('5.3 OPERATOR role requests to all financial endpoints -> MUST return 403 Forbidden', () => {
      endpoints.forEach(({ method, path, body }) => {
        it(`${method.toUpperCase()} ${path} as OPERATOR -> 403`, async () => {
          let req: any;
          if (method === 'get') req = request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${operatorToken}`);
          if (method === 'post') req = request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${operatorToken}`).send(body);
          if (method === 'put') req = request(app.getHttpServer()).put(path).set('Authorization', `Bearer ${operatorToken}`).send(body);

          const res = await req;
          expect(res.status).toBe(403);
          expect(res.body.message).toMatch(/yetarli ruxsat yo'q/i);
        });
      });
    });

    describe('5.4 ACCOUNTANT role requests to financial endpoints -> MUST be permitted (200 / 201)', () => {
      it('GET /api/payments as ACCOUNTANT -> 200 OK', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/payments')
          .set('Authorization', `Bearer ${accountantToken}`);
        expect(res.status).toBe(200);
      });

      it('GET /api/payments/summary as ACCOUNTANT -> 200 OK', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/payments/summary')
          .set('Authorization', `Bearer ${accountantToken}`);
        expect(res.status).toBe(200);
      });

      it('GET /api/payments/pay-challenger-1 as ACCOUNTANT -> 200 OK', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/payments/pay-challenger-1')
          .set('Authorization', `Bearer ${accountantToken}`);
        expect(res.status).toBe(200);
      });
    });

    describe('5.5 SUPER_ADMIN role requests to financial endpoints -> MUST be permitted (200 / 201)', () => {
      it('GET /api/payments as SUPER_ADMIN -> 200 OK', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/payments')
          .set('Authorization', `Bearer ${superAdminToken}`);
        expect(res.status).toBe(200);
      });

      it('POST /api/payments as SUPER_ADMIN -> 201 Created', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/payments')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            leadId: 'lead-student-a',
            amount: 500000,
            method: PaymentMethod.CASH,
          });
        expect(res.status).toBe(201);
      });
    });
  });
});
