import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationStatus, MessageSender, TaskType } from '@prisma/client';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: PrismaService;

  const mockPrisma = {
    conversation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
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
        ConversationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('checkHandoffTriggers', () => {
    it('should detect operator request', () => {
      const res = service.checkHandoffTriggers('Iltimos operator bilan bog\'lang');
      expect(res.needsHandoff).toBe(true);
      expect(res.reason).toBe('OPERATOR_REQUEST');
    });

    it('should detect complaints', () => {
      const res = service.checkHandoffTriggers('Bu juda yomon xizmat, shikoyat qilmoqchiman');
      expect(res.needsHandoff).toBe(true);
      expect(res.reason).toBe('COMPLAINT');
    });

    it('should detect price negotiations', () => {
      const res = service.checkHandoffTriggers('Narxni yana tushib bering, arzonroq qilib bering');
      expect(res.needsHandoff).toBe(true);
      expect(res.reason).toBe('PRICE_NEGOTIATION');
    });

    it('should not trigger handoff for normal questions', () => {
      const res = service.checkHandoffTriggers('Darslar soat nechada boshlanadi?');
      expect(res.needsHandoff).toBe(false);
    });
  });

  describe('triggerHandoff', () => {
    it('should change status to NEEDS_HUMAN, create system message, and create urgent admin task', async () => {
      const conversation = {
        id: 'conv-1',
        status: ConversationStatus.AI_HANDLING,
        lead: { id: 'lead-1', fullName: 'Shaxboz' },
      };

      (mockPrisma.conversation.findUnique as jest.Mock).mockResolvedValue(conversation);
      (mockPrisma.conversation.update as jest.Mock).mockResolvedValue({
        ...conversation,
        status: ConversationStatus.NEEDS_HUMAN,
      });

      const updated = await service.triggerHandoff('conv-1', 'OPERATOR_REQUEST');

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
          data: expect.objectContaining({
            status: ConversationStatus.NEEDS_HUMAN,
            handoffReason: 'OPERATOR_REQUEST',
          }),
        }),
      );

      expect(mockPrisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversationId: 'conv-1',
            senderType: MessageSender.SYSTEM,
          }),
        }),
      );

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskType: TaskType.CALL_LEAD,
            priority: 'URGENT',
            leadId: 'lead-1',
          }),
        }),
      );
    });
  });
});
