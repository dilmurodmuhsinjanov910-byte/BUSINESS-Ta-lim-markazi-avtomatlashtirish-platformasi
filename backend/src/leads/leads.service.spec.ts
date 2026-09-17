import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus, ScoreTier, LeadSource, ActivityType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  const mockPrisma = {
    lead: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    leadActivity: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('Phone Normalization', () => {
    it('should normalize 9-digit phone numbers to +998 format', () => {
      expect(service.normalizePhone('901234567')).toBe('+998901234567');
      expect(service.normalizePhone('+998901234567')).toBe('+998901234567');
      expect(service.normalizePhone('998901234567')).toBe('+998901234567');
    });
  });

  describe('calculateTier', () => {
    it('should return HOT for score >= 70', () => {
      expect(service.calculateTier(70)).toBe(ScoreTier.HOT);
      expect(service.calculateTier(95)).toBe(ScoreTier.HOT);
    });

    it('should return WARM for 40 <= score < 70', () => {
      expect(service.calculateTier(40)).toBe(ScoreTier.WARM);
      expect(service.calculateTier(69)).toBe(ScoreTier.WARM);
    });

    it('should return COLD for score < 40', () => {
      expect(service.calculateTier(39)).toBe(ScoreTier.COLD);
      expect(service.calculateTier(10)).toBe(ScoreTier.COLD);
    });
  });

  describe('Lead De-duplication (upsertLead)', () => {
    it('should create new lead if no existing lead matches phone or telegramId', async () => {
      (mockPrisma.lead.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.lead.create as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        fullName: 'Ali Valiyev',
        phone: '+998901112233',
        score: 60,
        scoreTier: ScoreTier.WARM,
        status: LeadStatus.NEW,
      });

      const result = await service.upsertLead({
        fullName: 'Ali Valiyev',
        phone: '901112233',
        telegramId: '12345',
        source: LeadSource.TELEGRAM,
      });

      expect(result.isDuplicate).toBe(false);
      expect(mockPrisma.lead.create).toHaveBeenCalled();
    });

    it('should NOT create duplicate lead if phone already exists, updating timeline instead', async () => {
      const existingLead = {
        id: 'lead-existing',
        fullName: 'Ali Valiyev',
        phone: '+998901112233',
        telegramId: null,
        score: 50,
        scoreTier: ScoreTier.WARM,
        notes: 'Initial lead note',
      };

      (mockPrisma.lead.findFirst as jest.Mock).mockResolvedValue(existingLead);
      (mockPrisma.lead.update as jest.Mock).mockResolvedValue({
        ...existingLead,
        score: 60,
      });

      const result = await service.upsertLead({
        fullName: 'Ali Valiyev',
        phone: '+998901112233',
        telegramId: '99999',
      });

      expect(result.isDuplicate).toBe(true);
      expect(mockPrisma.lead.create).not.toHaveBeenCalled();
      expect(mockPrisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-existing' },
        }),
      );
      expect(mockPrisma.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: 'lead-existing',
            type: ActivityType.MESSAGE,
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should throw BadRequestException if status is LOST but lostReason is missing', async () => {
      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        status: LeadStatus.NEW,
        score: 50,
      });

      await expect(
        service.updateStatus('lead-1', LeadStatus.LOST, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update status to LOST when lostReason is provided', async () => {
      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        status: LeadStatus.NEW,
        score: 50,
      });
      (mockPrisma.lead.update as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        status: LeadStatus.LOST,
        lostReason: 'Narx to\'g\'ri kelmadi',
        score: 0,
        scoreTier: ScoreTier.COLD,
      });

      const result = await service.updateStatus('lead-1', LeadStatus.LOST, "Narx to'g'ri kelmadi");
      expect(result.status).toBe(LeadStatus.LOST);
      expect(mockPrisma.leadActivity.create).toHaveBeenCalled();
    });
  });
});
