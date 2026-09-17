import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';
import { ConfigService } from '@nestjs/config';
import { LeadsService } from '../leads/leads.service';
import { AiService } from '../ai/ai.service';
import { ConversationsService } from '../conversations/conversations.service';
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

  describe('Trial lesson inquiries', () => {
    it('should list available groups for trial lesson', async () => {
      const result = await service.handleTrialRequest('123456789', 'Anvar Qodirov');

      expect(mockAiService.executeTool).toHaveBeenCalledWith('getAvailableGroups', {});
      expect(result.reply).toContain('ENG-101');
      expect((result.groups as any[]).length).toBe(1);
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
});
