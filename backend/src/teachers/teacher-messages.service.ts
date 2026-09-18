import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { Role } from '@prisma/client';

export interface ReplyTeacherMessageDto {
  content: string;
}

@Injectable()
export class TeacherMessagesService {
  private readonly logger = new Logger(TeacherMessagesService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  // List all teachers who have messages or are registered, with unread message counts
  async getConversations() {
    const teachers = await this.prisma.user.findMany({
      where: { role: Role.TEACHER },
      include: {
        teacherMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const unreadCounts = await this.prisma.teacherMessage.groupBy({
      by: ['teacherId'],
      where: { isRead: false, senderRole: 'TEACHER' },
      _count: { id: true },
    });

    const unreadMap = new Map<string, number>();
    unreadCounts.forEach((u) => unreadMap.set(u.teacherId, u._count.id));

    return teachers.map((t) => ({
      teacherId: t.id,
      teacherName: t.fullName,
      teacherPhone: t.phone || '',
      teacherEmail: t.email,
      telegramId: t.telegramId || '',
      unreadCount: unreadMap.get(t.id) || 0,
      lastMessage: t.teacherMessages[0] || null,
    }));
  }

  // Get messages for specific teacher
  async getMessages(teacherId: string) {
    const teacher = await this.prisma.user.findFirst({
      where: { id: teacherId, role: Role.TEACHER },
    });
    if (!teacher) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    // Mark teacher messages as read when admin opens them
    await this.prisma.teacherMessage.updateMany({
      where: { teacherId, senderRole: 'TEACHER', isRead: false },
      data: { isRead: true },
    });

    return this.prisma.teacherMessage.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Teacher sends message
  async sendFromTeacher(teacherId: string, content: string) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Xabar matni bo\'sh bo\'lishi mumkin emas');
    }

    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    return this.prisma.teacherMessage.create({
      data: {
        teacherId,
        senderRole: 'TEACHER',
        content: content.trim(),
        isRead: false,
      },
    });
  }

  // Admin replies to teacher
  async replyFromAdmin(teacherId: string, content: string) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Javob matni bo\'sh bo\'lishi mumkin emas');
    }

    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    const message = await this.prisma.teacherMessage.create({
      data: {
        teacherId,
        senderRole: 'ADMIN',
        content: content.trim(),
        isRead: true,
      },
    });

    // Dispatch notification to teacher Telegram
    if (teacher.telegramId) {
      const telegramText =
        `👨‍💼 **Markaz Ma'muriyatidan (Admin) javob:**\n\n` +
        `${content.trim()}\n\n` +
        `_Yangi xabar yuborish uchun botda "✉️ Adminga xabar" tugmasidan foydalaning._`;

      try {
        await this.telegramService.sendMessageToTelegramUser(teacher.telegramId, telegramText);
      } catch (err: any) {
        this.logger.warn(`O'qituvchiga Telegram xabar yuborishda xato: ${err.message}`);
      }
    }

    return message;
  }
}
