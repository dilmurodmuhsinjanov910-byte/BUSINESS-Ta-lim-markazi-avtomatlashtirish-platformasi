import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads/leads.service';
import { BookingsService } from './bookings/bookings.service';
import { ConversationsService } from './conversations/conversations.service';
import { PaymentsService } from './payments/payments.service';
import { TelegramService } from './telegram/telegram.service';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LeadStatus, BookingStatus, ConversationStatus, PaymentStatus, PaymentMethod, ScoreTier, GroupStatus } from '@prisma/client';

describe('UAT Final Integration Flow: Lead -> IELTS -> Filial -> Trial -> Reminder -> Admin Handoff -> Payment -> WON', () => {
  let leadsService: LeadsService;
  let bookingsService: BookingsService;
  let conversationsService: ConversationsService;
  let paymentsService: PaymentsService;
  let prisma: PrismaService;

  let leadId: string;
  let conversationId: string;
  let bookingId: string;
  let paymentId: string;

  const mockDb = {
    leads: [] as any[],
    bookings: [] as any[],
    reminders: [] as any[],
    conversations: [] as any[],
    messages: [] as any[],
    payments: [] as any[],
    activities: [] as any[],
    tasks: [] as any[],
    groups: [
      {
        id: 'group-ielts-1',
        name: 'IELTS 18:30 Dush-Juma',
        courseId: 'course-ielts',
        branchId: 'branch-chilonzor',
        maxStudents: 10,
        currentStudents: 4,
        status: GroupStatus.ACTIVE,
        course: { id: 'course-ielts', name: 'IELTS Intensive', monthlyPrice: 850000 },
        branch: { id: 'branch-chilonzor', name: 'Chilonzor filiali' },
      },
    ],
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        BookingsService,
        ConversationsService,
        PaymentsService,
        {
          provide: TelegramService,
          useValue: {
            sendPaymentReceiptAlert: jest.fn().mockResolvedValue(true),
            sendPaymentReminderAlert: jest.fn().mockResolvedValue(true),
            sendEnrollmentNotification: jest.fn().mockResolvedValue(true),
            sendAttendanceAlert: jest.fn().mockResolvedValue(true),
            sendGradeAlert: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock_val') },
        },
        {
          provide: PrismaService,
          useValue: {
            lead: {
              findFirst: jest.fn().mockImplementation(({ where }) => {
                if (where?.OR) {
                  for (const cond of where.OR) {
                    if (cond.phone) {
                      const found = mockDb.leads.find(l => l.phone === cond.phone);
                      if (found) return Promise.resolve(found);
                    }
                    if (cond.telegramId) {
                      const found = mockDb.leads.find(l => l.telegramId === cond.telegramId);
                      if (found) return Promise.resolve(found);
                    }
                  }
                }
                return Promise.resolve(null);
              }),
              findUnique: jest.fn().mockImplementation(({ where }) => {
                return Promise.resolve(mockDb.leads.find(l => l.id === where.id) || null);
              }),
              create: jest.fn().mockImplementation(({ data }) => {
                const lead = {
                  id: `lead-${Date.now()}`,
                  score: 20,
                  scoreTier: ScoreTier.COLD,
                  status: LeadStatus.NEW,
                  createdAt: new Date(),
                  ...data,
                };
                mockDb.leads.push(lead);
                return Promise.resolve(lead);
              }),
              update: jest.fn().mockImplementation(({ where, data }) => {
                const idx = mockDb.leads.findIndex(l => l.id === where.id);
                if (idx !== -1) {
                  mockDb.leads[idx] = { ...mockDb.leads[idx], ...data };
                  return Promise.resolve(mockDb.leads[idx]);
                }
                return Promise.resolve(null);
              }),
            },
            leadActivity: {
              create: jest.fn().mockImplementation(({ data }) => {
                const act = { id: `act-${Date.now()}`, ...data, createdAt: new Date() };
                mockDb.activities.push(act);
                return Promise.resolve(act);
              }),
            },
            group: {
              findUnique: jest.fn().mockImplementation(({ where }) => {
                return Promise.resolve(mockDb.groups.find(g => g.id === where.id) || null);
              }),
              update: jest.fn().mockImplementation(({ where, data }) => {
                const group = mockDb.groups.find(g => g.id === where.id);
                if (group && data.currentStudents !== undefined) {
                  group.currentStudents = data.currentStudents;
                  if (data.status) group.status = data.status;
                }
                return Promise.resolve(group);
              }),
            },
            trialBooking: {
              count: jest.fn().mockImplementation(({ where }) => {
                return Promise.resolve(
                  mockDb.bookings.filter(b => b.groupId === where.groupId && [BookingStatus.BOOKED, BookingStatus.CONFIRMED].includes(b.status)).length
                );
              }),
              findFirst: jest.fn().mockImplementation(({ where }) => {
                if (where?.groupId && where?.leadId) {
                  return Promise.resolve(
                    mockDb.bookings.find(b => b.leadId === where.leadId && b.groupId === where.groupId && [BookingStatus.BOOKED, BookingStatus.CONFIRMED].includes(b.status)) || null
                  );
                }
                if (where?.leadId) {
                  return Promise.resolve(
                    mockDb.bookings.find(b => b.leadId === where.leadId) || null
                  );
                }
                return Promise.resolve(null);
              }),
              create: jest.fn().mockImplementation(({ data }) => {
                const b = {
                  id: `book-${Date.now()}`,
                  status: BookingStatus.BOOKED,
                  createdAt: new Date(),
                  ...data,
                };
                mockDb.bookings.push(b);
                return Promise.resolve(b);
              }),
              findUnique: jest.fn().mockImplementation(({ where }) => {
                const b = mockDb.bookings.find(b => b.id === where.id);
                if (b) {
                  const lead = mockDb.leads.find(l => l.id === b.leadId);
                  const group = mockDb.groups.find(g => g.id === b.groupId);
                  return Promise.resolve({ ...b, lead, group });
                }
                return Promise.resolve(null);
              }),
              update: jest.fn().mockImplementation(({ where, data }) => {
                const idx = mockDb.bookings.findIndex(b => b.id === where.id);
                if (idx !== -1) {
                  mockDb.bookings[idx] = { ...mockDb.bookings[idx], ...data };
                  return Promise.resolve(mockDb.bookings[idx]);
                }
                return Promise.resolve(null);
              }),
            },
            reminder: {
              create: jest.fn().mockImplementation(({ data }) => {
                const r = { id: `rem-${Date.now()}`, ...data };
                mockDb.reminders.push(r);
                return Promise.resolve(r);
              }),
              createMany: jest.fn().mockImplementation(({ data }) => {
                const items = Array.isArray(data) ? data : [data];
                items.forEach((item, idx) => {
                  mockDb.reminders.push({ id: `rem-${Date.now()}-${idx}`, ...item });
                });
                return Promise.resolve({ count: items.length });
              }),
              updateMany: jest.fn().mockImplementation(({ where, data }) => {
                mockDb.reminders.forEach(r => {
                  if (r.bookingId === where.bookingId) Object.assign(r, data);
                });
                return Promise.resolve({ count: mockDb.reminders.length });
              }),
            },
            conversation: {
              findFirst: jest.fn().mockImplementation(({ where }) => {
                return Promise.resolve(mockDb.conversations.find(c => c.leadId === where.leadId) || null);
              }),
              create: jest.fn().mockImplementation(({ data }) => {
                const c = { id: `conv-${Date.now()}`, ...data, messages: [] };
                mockDb.conversations.push(c);
                return Promise.resolve(c);
              }),
              findUnique: jest.fn().mockImplementation(({ where }) => {
                const conv = mockDb.conversations.find(c => c.id === where.id);
                if (conv) {
                  const lead = mockDb.leads.find(l => l.id === conv.leadId);
                  return Promise.resolve({ ...conv, lead });
                }
                return Promise.resolve(null);
              }),
              update: jest.fn().mockImplementation(({ where, data }) => {
                const c = mockDb.conversations.find(c => c.id === where.id);
                if (c) Object.assign(c, data);
                return Promise.resolve(c);
              }),
            },
            message: {
              create: jest.fn().mockImplementation(({ data }) => {
                const m = { id: `msg-${Date.now()}`, ...data, createdAt: new Date() };
                mockDb.messages.push(m);
                return Promise.resolve(m);
              }),
            },
            task: {
              create: jest.fn().mockImplementation(({ data }) => {
                const t = { id: `task-${Date.now()}`, ...data };
                mockDb.tasks.push(t);
                return Promise.resolve(t);
              }),
            },
            payment: {
              create: jest.fn().mockImplementation(({ data }) => {
                const p = { id: `pay-${Date.now()}`, currency: 'UZS', status: PaymentStatus.PENDING, ...data };
                mockDb.payments.push(p);
                return Promise.resolve(p);
              }),
              findUnique: jest.fn().mockImplementation(({ where }) => {
                return Promise.resolve(mockDb.payments.find(p => p.id === where.id) || null);
              }),
              update: jest.fn().mockImplementation(({ where, data }) => {
                const p = mockDb.payments.find(p => p.id === where.id);
                if (p) Object.assign(p, data);
                return Promise.resolve(p);
              }),
            },
            auditLog: {
              create: jest.fn().mockImplementation(({ data }) => {
                return Promise.resolve({ id: `audit-${Date.now()}`, ...data, createdAt: new Date() });
              }),
            },
          },
        },
      ],
    }).compile();

    leadsService = module.get<LeadsService>(LeadsService);
    bookingsService = module.get<BookingsService>(BookingsService);
    conversationsService = module.get<ConversationsService>(ConversationsService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // Step 1: Lead capture & phone de-duplication
  it('Step 1: Should capture a new lead from Telegram and normalize Uzbek phone number', async () => {
    const result = await leadsService.upsertLead({
      fullName: 'Aziz Karimov',
      phone: '90 123 45 67',
      telegramId: 'tg_user_9988',
      preferredCourse: 'IELTS Intensive',
      preferredBranchId: 'branch-chilonzor',
    });

    expect(result.lead).toBeDefined();
    expect(result.lead.phone).toBe('+998901234567');
    expect(result.lead.status).toBe(LeadStatus.NEW);
    expect(result.isDuplicate).toBe(false);
    leadId = result.lead.id;
  });

  // Step 2: Progressive Qualification and Scoring
  it('Step 2: Should qualify lead interest and calculate score progression', async () => {
    const updated = await leadsService.updateStatus(leadId, LeadStatus.QUALIFIED);
    expect(updated.status).toBe(LeadStatus.QUALIFIED);
    expect(updated.score).toBeGreaterThanOrEqual(35);

    // Give high score for trial interest
    await leadsService.updateScore(leadId, 45, 'Trial darsga qatnashish istagi bildirildi');
    const scoredLead = await leadsService.findOne(leadId);
    expect(scoredLead.scoreTier).toBe(ScoreTier.HOT);
  });

  // Step 3: Trial Booking and Seat Reservation
  it('Step 3: Should book a trial class in available group and schedule 24h & 2h reminders', async () => {
    const trialDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]; // 2 days later

    const booking = await bookingsService.createBooking({
      leadId,
      groupId: 'group-ielts-1',
      bookingDate: trialDate,
    });

    expect(booking).toBeDefined();
    expect(booking.status).toBe(BookingStatus.BOOKED);
    bookingId = booking.id;

    // Verify reminders generated in mock DB
    expect(mockDb.reminders.length).toBe(2);
  });

  // Step 4: Prevent Duplicate Booking for Same Lead in Same Group
  it('Step 4: Should reject duplicate active booking for the same student in same group', async () => {
    const trialDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

    await expect(
      bookingsService.createBooking({
        leadId,
        groupId: 'group-ielts-1',
        bookingDate: trialDate,
      })
    ).rejects.toThrow();
  });

  // Step 5: Human Handoff Workflow
  it('Step 5: Should trigger human handoff when user asks for human operator and allow admin takeover', async () => {
    const conv = await conversationsService.findOrCreateForLead(leadId);
    conversationId = conv.id;

    // User asks for operator
    const handoffResult = await conversationsService.triggerHandoff(conv.id, 'OPERATOR_REQUEST');
    expect(handoffResult.status).toBe(ConversationStatus.NEEDS_HUMAN);

    // Operator takes over conversation
    const takeover = await conversationsService.takeOver(conv.id, 'admin-user-1');
    expect(takeover.status).toBe(ConversationStatus.ADMIN_HANDLING);
    expect(takeover.assignedAdminId).toBe('admin-user-1');
  });

  // Step 6: Trial Attendance & Status Lock
  it('Step 6: Should mark trial as ATTENDED and advance lead status', async () => {
    const attended = await bookingsService.updateStatus(bookingId, BookingStatus.ATTENDED, 'admin-user-1');
    expect(attended.status).toBe(BookingStatus.ATTENDED);

    // Lead status advances
    const lead = await leadsService.findOne(leadId);
    expect(lead.status).toBe(LeadStatus.TRIAL_ATTENDED);
  });

  // Step 7: Payment creation & auto-conversion to WON
  it('Step 7: Should record tuition payment, mark as PAID, increment group count, and convert lead to WON', async () => {
    // 1. Create Invoice
    const payment = await paymentsService.create({
      leadId,
      amount: 850000,
      method: PaymentMethod.PAYME,
      notes: 'Payme ilovasi orqali to‘liq oylik to‘lov',
    });
    paymentId = payment.id;
    expect(payment.status).toBe(PaymentStatus.PENDING);

    // 2. Mark invoice as paid
    const paid = await paymentsService.markAsPaid(payment.id, 'staff-accountant-1');
    expect(paid.status).toBe(PaymentStatus.PAID);

    // 3. Verify group student count increased from 4 to 5
    const group = await prisma.group.findUnique({ where: { id: 'group-ielts-1' } });
    expect(group.currentStudents).toBe(5);

    // 4. Lead is automatically converted to WON and score set to 100
    const wonLead = await leadsService.findOne(leadId);
    expect(wonLead.status).toBe(LeadStatus.WON);
    expect(wonLead.score).toBe(100);
    expect(wonLead.scoreTier).toBe(ScoreTier.HOT);
  });
});
