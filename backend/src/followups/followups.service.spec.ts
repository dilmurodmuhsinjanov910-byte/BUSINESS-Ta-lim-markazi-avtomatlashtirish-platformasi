import { Test, TestingModule } from '@nestjs/testing';
import { FollowupsService } from './followups.service';
import { PrismaService } from '../prisma/prisma.service';
import { FollowUpStatus, TaskType, TaskPriority } from '@prisma/client';

describe('FollowupsService', () => {
  let service: FollowupsService;
  let prisma: PrismaService;

  const mockPrisma = {
    followUp: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    lead: {
      findUnique: jest.fn(),
    },
    task: {
      create: jest.fn(),
    },
    leadActivity: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowupsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FollowupsService>(FollowupsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('processDueFollowUps - Non-spam limit and Escalation', () => {
    it('should send follow-up #1 safely and mark it SENT', async () => {
      const dueFollowUps = [
        {
          id: 'fu-1',
          sequence: 1,
          booking: {
            lead: { id: 'lead-1', fullName: 'Otabek' },
            group: { course: { name: 'General English' } },
          },
          messageText: 'Sinov darsiga kelmadingiz...',
        },
      ];

      (mockPrisma.followUp.findMany as jest.Mock).mockResolvedValue(dueFollowUps);
      (mockPrisma.followUp.update as jest.Mock).mockResolvedValue({});

      const result = await service.processDueFollowUps();

      expect(result.processed).toBe(1);
      expect(result.escalated).toBe(0);
      expect(mockPrisma.followUp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fu-1' },
          data: expect.objectContaining({ status: FollowUpStatus.SENT }),
        }),
      );
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it('should escalate to Admin Task after follow-up #2 is exhausted without response', async () => {
      const dueFollowUps = [
        {
          id: 'fu-2',
          sequence: 2,
          booking: {
            lead: { id: 'lead-1', fullName: 'Otabek', phone: '+998901234567' },
            group: { course: { name: 'General English' } },
          },
          messageText: 'Joyingizni saqlab qoldik...',
        },
      ];

      (mockPrisma.followUp.findMany as jest.Mock).mockResolvedValue(dueFollowUps);
      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        status: 'NEW',
      });
      (mockPrisma.followUp.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.task.create as jest.Mock).mockResolvedValue({ id: 'task-1' });

      const result = await service.processDueFollowUps();

      expect(result.processed).toBe(1);
      expect(result.escalated).toBe(1);
      // Verify task creation
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskType: TaskType.CONTACT_TRIAL_MISSED,
            priority: TaskPriority.HIGH,
            leadId: 'lead-1',
          }),
        }),
      );
      // Verify follow-up escalated status
      expect(mockPrisma.followUp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fu-2' },
          data: expect.objectContaining({ status: FollowUpStatus.ESCALATED }),
        }),
      );
    });
  });
});
