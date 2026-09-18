import { Test, TestingModule } from '@nestjs/testing';
import { TeacherMessagesController } from './teacher-messages.controller';
import { TeacherMessagesService } from './teacher-messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

describe('TeacherMessages Module', () => {
  let controller: TeacherMessagesController;
  let service: TeacherMessagesService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    teacherMessage: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockTelegram = {
    sendMessageToTelegramUser: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeacherMessagesController],
      providers: [
        TeacherMessagesService,
        Reflector,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TelegramService, useValue: mockTelegram },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TeacherMessagesController>(TeacherMessagesController);
    service = module.get<TeacherMessagesService>(TeacherMessagesService);
    jest.clearAllMocks();
  });

  it('should have JwtAuthGuard and RolesGuard on TeacherMessagesController', () => {
    const guards = Reflect.getMetadata('__guards__', TeacherMessagesController);
    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  describe('getConversations', () => {
    it('should return teacher conversations with unread counts', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'teacher-1',
          fullName: 'Anvar Qodirov',
          email: 'anvar@example.com',
          phone: '+998901234567',
          telegramId: '987654321',
          teacherMessages: [{ content: 'Dars jadvali bo\'yicha savol bor', createdAt: new Date() }],
        },
      ]);
      mockPrisma.teacherMessage.groupBy.mockResolvedValue([
        { teacherId: 'teacher-1', _count: { id: 2 } },
      ]);

      const result = await service.getConversations();
      expect(result).toHaveLength(1);
      expect(result[0].teacherName).toBe('Anvar Qodirov');
      expect(result[0].unreadCount).toBe(2);
      expect(result[0].lastMessage?.content).toBe('Dars jadvali bo\'yicha savol bor');
    });
  });

  describe('replyFromAdmin', () => {
    it('should save admin message and dispatch Telegram message to teacher', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'teacher-1',
        fullName: 'Anvar Qodirov',
        telegramId: '987654321',
      });
      mockPrisma.teacherMessage.create.mockResolvedValue({
        id: 'msg-1',
        teacherId: 'teacher-1',
        senderRole: 'ADMIN',
        content: 'Salom, dars jadvalingiz tasdiqlandi',
        isRead: true,
      });

      const res = await service.replyFromAdmin('teacher-1', 'Salom, dars jadvalingiz tasdiqlandi');
      expect(res.senderRole).toBe('ADMIN');
      expect(mockTelegram.sendMessageToTelegramUser).toHaveBeenCalledWith(
        '987654321',
        expect.stringContaining('Salom, dars jadvalingiz tasdiqlandi'),
      );
    });

    it('should throw error if content is empty', async () => {
      await expect(service.replyFromAdmin('teacher-1', '   ')).rejects.toThrow();
    });
  });

  describe('sendFromTeacher', () => {
    it('should save teacher message with TEACHER role and isRead false', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'teacher-1' });
      mockPrisma.teacherMessage.create.mockResolvedValue({
        id: 'msg-2',
        teacherId: 'teacher-1',
        senderRole: 'TEACHER',
        content: 'Proyektor ishlamayapti',
        isRead: false,
      });

      const res = await service.sendFromTeacher('teacher-1', 'Proyektor ishlamayapti');
      expect(res.senderRole).toBe('TEACHER');
      expect(res.isRead).toBe(false);
    });
  });
});
