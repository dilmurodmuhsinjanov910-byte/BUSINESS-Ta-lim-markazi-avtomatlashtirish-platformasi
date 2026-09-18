import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { RecordGradeDto } from './dto/record-grade.dto';
import { Role } from '@prisma/client';

@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  async recordGrade(dto: RecordGradeDto, user?: any) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: {
        lead: true,
        group: { include: { course: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Biriktirilgan o'quvchi topilmadi (ID: ${dto.enrollmentId})`);
    }

    const enrollmentGroupId = enrollment.groupId || (enrollment as any).group?.id;
    if (dto.groupId && enrollmentGroupId && enrollmentGroupId !== dto.groupId) {
      throw new BadRequestException(
        `Biriktirilgan o'quvchi (ID: ${dto.enrollmentId}) ko'rsatilgan guruhga (ID: ${dto.groupId}) tegishli emas`,
      );
    }
    if (!dto.groupId && enrollmentGroupId) {
      dto.groupId = enrollmentGroupId;
    }

    const effectiveUser = user || (dto.markedById && this.prisma.user?.findUnique ? await this.prisma.user.findUnique({ where: { id: dto.markedById }, select: { id: true, role: true } }) : null);
    if (effectiveUser?.role === Role.TEACHER) {
      const teacherId = enrollment.group?.teacherId;
      if (teacherId && teacherId !== effectiveUser.id) {
        throw new ForbiddenException("Siz faqat o'zingizga biriktirilgan guruh o'quvchilariga baho qo'ya olasiz");
      }
    }

    const grade = await this.prisma.studentGrade.create({
      data: {
        enrollmentId: dto.enrollmentId,
        score: dto.score,
        maxScore: dto.maxScore ?? 100,
        gradeType: dto.gradeType ?? 'CLASSWORK',
        title: dto.title,
        comment: dto.comment,
        date: dto.date ? new Date(dto.date) : new Date(),
        markedById: dto.markedById,
      },
      include: {
        enrollment: {
          include: { lead: true },
        },
      },
    });

    // Send real-time grade alert if student has Telegram ID
    const lead = enrollment.lead;
    if (lead?.telegramId) {
      this.telegramService
        .sendGradeAlert(
          lead.telegramId,
          lead.fullName,
          dto.title,
          dto.score,
          dto.maxScore ?? 100,
          dto.gradeType ?? 'CLASSWORK',
          dto.comment,
        )
        .catch((err: any) => this.logger.warn(`Baho xabarnomasi yuborilmadi: ${err.message}`));
    }

    return grade;
  }

  async getGroupGrades(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException(`Guruh topilmadi (ID: ${groupId})`);
    }

    return this.prisma.studentGrade.findMany({
      where: {
        enrollment: {
          groupId,
        },
      },
      include: {
        enrollment: {
          include: { lead: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getStudentGrades(enrollmentId: string) {
    return this.prisma.studentGrade.findMany({
      where: { enrollmentId },
      orderBy: { date: 'desc' },
    });
  }
}
