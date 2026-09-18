import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService, parseNameAndAge } from './telegram.service';
import { ConfigService } from '@nestjs/config';
import { LeadsService } from '../leads/leads.service';
import { AiService } from '../ai/ai.service';
import { ConversationsService } from '../conversations/conversations.service';
import { BookingsService } from '../bookings/bookings.service';
import { GroupsService } from '../groups/groups.service';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus } from '@prisma/client';

describe('TelegramService', () => {
  let service: TelegramService;

  const mockLeadsService = {
    upsertLead: jest.fn().mockResolvedValue({
      lead: {
        id: 'lead-tg-1',
        fullName: 'Anvar Qodirov',
        phone: '+998901234567',
        score: 65,
        status: LeadStatus.NEW,
      },
      isDuplicate: false,
    }),
    updateStatus: jest.fn().mockResolvedValue({
      id: 'lead-tg-1',
      status: LeadStatus.QUALIFIED,
    }),
  };

  const mockAiService = {
    executeTool: jest.fn().mockResolvedValue([
      {
        id: 'g-1',
        name: 'ENG-101',
        courseName: 'General English',
        branchName: 'Chilonzor',
        daysOfWeek: 'Du-Chor-Jum',
        timeSlot: '10:00 - 11:20',
        availableSeats: 4,
      },
    ]),
    processUserMessage: jest.fn().mockResolvedValue({
      reply: 'AI response message',
      needsHumanHandoff: false,
    }),
  };

  const mockConversationsService = {
    findOrCreateForLead: jest.fn().mockResolvedValue({ id: 'conv-tg-1' }),
    triggerHandoff: jest.fn().mockResolvedValue({}),
    addMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
    registerTelegramDispatcher: jest.fn(),
  };

  const mockBookingRecord = {
    id: 'booking-1',
    leadId: 'lead-tg-1',
    groupId: 'g-1',
    bookingDate: new Date(),
    group: {
      id: 'g-1',
      name: 'ENG-101',
      timeSlot: '10:00 - 11:20',
      daysOfWeek: 'Du-Chor-Jum',
      course: { name: 'General English' },
    },
    branch: {
      id: 'b-1',
      name: 'Chilonzor filiali',
      address: 'Chilonzor metrosi',
    },
  };

  const mockBookingsService = {
    createBooking: jest.fn().mockResolvedValue(mockBookingRecord),
    findOne: jest.fn().mockResolvedValue(mockBookingRecord),
  };

  const mockGroupsService = {
    findAvailableForTrial: jest.fn().mockResolvedValue([
      {
        id: 'g-1',
        name: 'ENG-101',
        courseName: 'General English',
        branchName: 'Chilonzor filiali',
        daysOfWeek: 'Du-Chor-Jum',
        timeSlot: '10:00 - 11:20',
        availableSeats: 4,
      },
    ]),
  };

  const mockPrisma = {
    enrollment: {
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    attendance: {
      count: jest.fn().mockResolvedValue(0),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    teacherMessage: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock_telegram_bot_token') },
        },
        { provide: LeadsService, useValue: mockLeadsService },
        { provide: AiService, useValue: mockAiService },
        { provide: ConversationsService, useValue: mockConversationsService },
        { provide: BookingsService, useValue: mockBookingsService },
        { provide: GroupsService, useValue: mockGroupsService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
    jest.clearAllMocks();
  });

  describe('Lead Qualification via Contact Sharing', () => {
    it('should qualify lead and advance status to QUALIFIED when contact is shared', async () => {
      const result = await service.handleContactShared(
        '123456789',
        '+998901234567',
        'Anvar Qodirov',
        'anvar_q',
      );

      expect(mockLeadsService.upsertLead).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '+998901234567',
          telegramId: '123456789',
          fullName: 'Anvar Qodirov',
          initialScoreDelta: 15,
        }),
      );

      expect(mockLeadsService.updateStatus).toHaveBeenCalledWith(
        'lead-tg-1',
        LeadStatus.QUALIFIED,
        undefined,
        'system-telegram',
      );

      expect(result.reply).toContain('muvaffaqiyatli saqlandi');
    });
  });

  describe('Trial lesson inquiries & 1-Tap Booking', () => {
    it('should list available groups with inline buttons', async () => {
      const result = await service.handleTrialRequest('123456789', 'Anvar Qodirov');

      expect(mockAiService.executeTool).toHaveBeenCalledWith('getAvailableGroups', {});
      expect(result.reply).toContain('General English');
      expect((result.groups as any[]).length).toBe(1);
      expect(result.inlineKeyboard).toBeDefined();
    });

    it('should confirm 1-tap trial booking and save to database', async () => {
      const result = await service.handleConfirmTrialBooking('123456789', 'Anvar Qodirov', 'g-1');

      expect(mockBookingsService.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-tg-1',
          groupId: 'g-1',
        }),
      );
      expect(result.success).toBe(true);
      expect(result.reply).toContain('muvaffaqiyatli sinov darsiga yozildingiz');
      expect(mockConversationsService.addMessage).toHaveBeenCalled();
    });
  });

  describe('FAQ Menu & Instant Inline Answers', () => {
    it('should return interactive FAQ menu with category buttons', () => {
      const menu = service.getFaqMenu();
      expect(menu.text).toContain('Eng ko\'p beriladigan savollar');
      expect(menu.keyboard).toBeDefined();
    });

    it('should return verified pricing answer for pricing FAQ', async () => {
      const res = await service.handleFaqAnswer('123456789', 'Anvar Qodirov', 'pricing');
      expect(res.reply).toContain('General English');
      expect(res.reply).toContain('450,000');
      expect(res.action).toBe('FAQ_PRICING');
    });

    it('should return verified schedule answer for schedule FAQ', async () => {
      const res = await service.handleFaqAnswer('123456789', 'Anvar Qodirov', 'schedule');
      expect(res.reply).toContain('Toq kunlar');
      expect(res.reply).toContain('09:00');
      expect(res.action).toBe('FAQ_SCHEDULE');
    });
  });

  describe('Operator Request & Human Handoff', () => {
    it('should trigger human handoff and route to conversation queue', async () => {
      const result = await service.handleOperatorRequest('123456789', 'Anvar Qodirov');

      expect(mockConversationsService.findOrCreateForLead).toHaveBeenCalledWith('lead-tg-1', 'TELEGRAM');
      expect(mockConversationsService.triggerHandoff).toHaveBeenCalledWith('conv-tg-1', 'OPERATOR_REQUEST');
      expect(result.reply).toContain('administratorimizga yo\'naltirildi');
    });
  });

  describe('Student Name & Age Qualification', () => {
    it('should parse student name and age accurately', async () => {
      const parsed1 = parseNameAndAge('Jasur Aliyev, 16 yosh');
      expect(parsed1.fullName).toBe('Jasur Aliyev');
      expect(parsed1.age).toBe(16);

      const parsed2 = parseNameAndAge('Madina 14 yoshda');
      expect(parsed2.fullName).toBe('Madina');
      expect(parsed2.age).toBe(14);

      const parsed3 = parseNameAndAge('Rustam');
      expect(parsed3.fullName).toBe('Rustam');
      expect(parsed3.age).toBeUndefined();
    });

    it('should qualify name and age via simulateNameAndAgeInput', async () => {
      const res = await service.simulateNameAndAgeInput('123456789', 'Jasur Aliyev, 16 yosh');
      expect(res.parsed.fullName).toBe('Jasur Aliyev');
      expect(res.parsed.age).toBe(16);
      expect(mockLeadsService.upsertLead).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Jasur Aliyev',
          age: 16,
        }),
      );
    });
  });
});
