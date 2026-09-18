import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentStatus } from '@prisma/client';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
    private configService: ConfigService,
  ) {}

  async create(dto: CreateEnrollmentDto, createdById?: string) {
    return this.createEnrollment(dto, createdById);
  }

  async createEnrollment(dto: CreateEnrollmentDto, createdById?: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });
    if (!lead) {
      throw new NotFoundException(`Lid topilmadi (ID: ${dto.leadId})`);
    }

    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      include: {
        course: true,
        branch: true,
      },
    });
    if (!group) {
      throw new NotFoundException(`Guruh topilmadi (ID: ${dto.groupId})`);
    }

    // Check group capacity (strict limit enforcement)
    const capacity = (group as any).capacity !== undefined ? (group as any).capacity : (group.maxStudents ?? 12);
    let activeEnrollmentCount = typeof group.currentStudents === 'number' ? group.currentStudents : 0;
    if (this.prisma.enrollment?.count) {
      const dbCount = await this.prisma.enrollment.count({
        where: {
          groupId: dto.groupId,
          status: EnrollmentStatus.ACTIVE,
        },
      });
      if (typeof dbCount === 'number' && !isNaN(dbCount)) {
        activeEnrollmentCount = dbCount;
      }
    }

    const groupStudents = typeof group.currentStudents === 'number' ? group.currentStudents : 0;
    const currentCount = Math.max(activeEnrollmentCount, groupStudents);
    if (currentCount >= capacity || group.status === 'FULL') {
      throw new BadRequestException("Guruh sig'imi to'lgan");
    }

    // Check existing active enrollment
    const existing = await this.prisma.enrollment.findFirst({
      where: {
        leadId: dto.leadId,
        groupId: dto.groupId,
        status: EnrollmentStatus.ACTIVE,
      },
    });
    if (existing) {
      throw new BadRequestException("Ushbu o'quvchi bu guruhga allaqachon biriktirilgan");
    }

    const monthlyFee = dto.monthlyFee ?? group.course?.monthlyPrice ?? 0;

    // Database transaction: create enrollment, increment currentStudents, mark lead WON, create activity
    const enrollment = await this.prisma.$transaction(async (tx) => {
      // Concurrency safeguard: re-verify capacity inside atomic transaction
      const txGroup = await tx.group.findUnique({
        where: { id: group.id },
      });
      if (!txGroup) {
        throw new NotFoundException(`Guruh topilmadi (ID: ${group.id})`);
      }
      const txCapacity = (txGroup as any).capacity !== undefined ? (txGroup as any).capacity : (txGroup.maxStudents ?? 12);
      let txActiveCount = typeof txGroup.currentStudents === 'number' ? txGroup.currentStudents : 0;
      if (tx.enrollment?.count) {
        const txDbCount = await tx.enrollment.count({
          where: {
            groupId: group.id,
            status: EnrollmentStatus.ACTIVE,
          },
        });
        if (typeof txDbCount === 'number' && !isNaN(txDbCount)) {
          txActiveCount = txDbCount;
        }
      }
      const txGroupStudents = typeof txGroup.currentStudents === 'number' ? txGroup.currentStudents : 0;
      const txCurrentCount = Math.max(txActiveCount, txGroupStudents);
      if (txCurrentCount >= txCapacity || txGroup.status === 'FULL') {
        throw new BadRequestException("Guruh sig'imi to'lgan");
      }

      const newEnrollment = await tx.enrollment.create({
        data: {
          leadId: dto.leadId,
          groupId: dto.groupId,
          monthlyFee,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          lead: true,
          group: {
            include: {
              course: true,
              branch: true,
            },
          },
        },
      });

      const updatedCount = txCurrentCount + 1;
      await tx.group.update({
        where: { id: group.id },
        data: {
          currentStudents: updatedCount,
          status: updatedCount >= txCapacity ? 'FULL' : txGroup.status,
        },
      });

      await tx.lead.update({
        where: { id: dto.leadId },
        data: {
          status: 'WON',
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: dto.leadId,
          type: 'STATUS_CHANGE',
          title: "Kursga qabul qilindi (Guruhga biriktirildi)",
          description: `Guruh: ${group.name}, Kurs: ${group.course.name}, Oylik to'lov: ${monthlyFee.toLocaleString('uz-UZ')} so'm`,
          createdById,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'ENROLLMENT',
          entityId: newEnrollment.id,
          action: 'CREATE_ENROLLMENT',
          changedById: createdById || null,
          newValue: JSON.stringify({
            leadId: dto.leadId,
            groupId: dto.groupId,
            monthlyFee,
            leadName: lead.fullName,
            groupName: group.name,
          }),
        },
      });

      return newEnrollment;
    });

    // Notify student on Telegram with Mini App WebApp button
    if (lead.telegramId) {
      const configuredBase = this.configService.get<string>('WEBAPP_BASE_URL');
      const baseUrl = (configuredBase && configuredBase.startsWith('https://'))
        ? configuredBase.replace(/\/+$/, '')
        : 'https://al-xorazmiy-edu.loca.lt';
      const webAppUrl = `${baseUrl}/student?telegramId=${lead.telegramId}&enrollmentId=${enrollment.id}`;
      const schedule = `${group.daysOfWeek} (${group.startTime} - ${group.endTime}), Xona: ${group.roomNumber || 'Asosiy'}`;

      try {
        await this.telegramService.sendEnrollmentNotification(
          lead.telegramId,
          group.course.name,
          group.name,
          schedule,
          webAppUrl,
        );
      } catch (err: any) {
        this.logger.error(`Talabaga telegram xabar yuborishda xatolik: ${err.message}`);
      }
    }

    return enrollment;
  }

  async getAllEnrollments(query?: { groupId?: string; status?: EnrollmentStatus }) {
    const whereClause: any = {};
    if (query?.groupId) whereClause.groupId = query.groupId;
    if (query?.status) whereClause.status = query.status;

    return this.prisma.enrollment.findMany({
      where: whereClause,
      include: {
        lead: true,
        group: {
          include: {
            course: true,
            branch: true,
          },
        },
        attendances: {
          orderBy: { date: 'desc' },
        },
        grades: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEnrollmentById(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        lead: true,
        group: {
          include: {
            course: true,
            branch: true,
          },
        },
        attendances: {
          orderBy: { date: 'desc' },
        },
        grades: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Qabul yozuvi topilmadi (ID: ${id})`);
    }

    return enrollment;
  }

  async getStudentPortalData(identifier: string) {
    // Identifier can be leadId or telegramId
    const lead = await this.prisma.lead.findFirst({
      where: {
        OR: [{ id: identifier }, { telegramId: identifier }],
      },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        enrollments: {
          include: {
            group: {
              include: {
                course: true,
                branch: true,
              },
            },
            attendances: {
              orderBy: { date: 'desc' },
            },
            grades: {
              orderBy: { date: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`O'quvchi topilmadi (ID yoki Telegram: ${identifier})`);
    }

    const processedEnrollments = lead.enrollments.map((enr) => {
      const attendances = enr.attendances || [];
      const grades = enr.grades || [];

      const totalLessons = attendances.length;
      const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
      const lateCount = attendances.filter((a) => a.status === 'LATE').length;
      const excusedCount = attendances.filter((a) => a.status === 'EXCUSED').length;
      const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;

      const attendancePercentage =
        totalLessons > 0
          ? Math.round(((presentCount + lateCount * 0.8 + excusedCount * 0.5) / totalLessons) * 100)
          : 100;

      const averageGrade =
        grades.length > 0
          ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length)
          : null;

      // Sanitize attendances to avoid leaking internal staff IDs (markedById)
      const sanitizedAttendances = attendances.map((a) => ({
        id: a.id,
        date: a.date,
        status: a.status,
        notes: a.notes,
      }));

      // Sanitize grades to avoid leaking internal staff IDs (markedById)
      const sanitizedGrades = grades.map((g) => ({
        id: g.id,
        score: g.score,
        maxScore: g.maxScore,
        gradeType: g.gradeType,
        title: g.title,
        comment: g.comment,
        date: g.date,
      }));

      return {
        id: enr.id,
        status: enr.status,
        monthlyFee: enr.monthlyFee,
        enrolledAt: enr.enrolledAt,
        group: {
          id: enr.group.id,
          name: enr.group.name,
          daysOfWeek: enr.group.daysOfWeek,
          startTime: enr.group.startTime,
          endTime: enr.group.endTime,
          roomNumber: enr.group.roomNumber,
          course: {
            id: enr.group.course.id,
            name: enr.group.course.name,
            level: enr.group.course.level,
            language: enr.group.course.language,
            monthlyPrice: enr.group.course.monthlyPrice,
          },
          branch: {
            id: enr.group.branch.id,
            name: enr.group.branch.name,
            address: enr.group.branch.address,
            phone: enr.group.branch.phone,
          },
        },
        stats: {
          totalLessons,
          presentCount,
          lateCount,
          excusedCount,
          absentCount,
          attendancePercentage,
          averageGrade,
          totalGradesCount: grades.length,
        },
        attendances: sanitizedAttendances,
        grades: sanitizedGrades,
      };
    });

    // Sanitize student PII: mask phone number to protect student privacy against scraping
    const maskedPhone = lead.phone
      ? lead.phone.length > 7
        ? `${lead.phone.slice(0, 5)}****${lead.phone.slice(-3)}`
        : lead.phone
      : null;

    // Sanitize payments: omit internal staff notes, recordedById, and internal DB timestamps
    const sanitizedPayments = (lead.payments || []).map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency || 'UZS',
      status: p.status,
      method: p.method,
      createdAt: p.createdAt,
    }));

    return {
      student: {
        id: lead.id,
        fullName: lead.fullName,
        phone: maskedPhone,
        telegramId: lead.telegramId,
        telegramUsername: lead.telegramUsername,
        age: lead.age,
      },
      enrollments: processedEnrollments,
      payments: sanitizedPayments,
    };
  }

  async getTeacherPortalData(teacherIdentifier?: string) {
    const whereClause: any = {
      status: { not: 'ARCHIVED' },
    };
    if (teacherIdentifier) {
      whereClause.teacherId = teacherIdentifier;
    }

    const groups = await this.prisma.group.findMany({
      where: whereClause,
      include: {
        course: true,
        branch: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            lead: true,
            attendances: {
              orderBy: { date: 'desc' },
              take: 15,
            },
            grades: {
              orderBy: { date: 'desc' },
              take: 15,
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      teacherIdentifier: teacherIdentifier || 'all',
      today: new Date().toISOString().split('T')[0],
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        courseName: g.course.name,
        branchName: g.branch.name,
        daysOfWeek: g.daysOfWeek,
        startTime: g.startTime,
        endTime: g.endTime,
        roomNumber: g.roomNumber,
        maxStudents: g.maxStudents,
        currentStudents: g.currentStudents,
        students: g.enrollments.map((e) => {
          const grades = e.grades || [];
          const attendances = e.attendances || [];
          const avg = grades.length > 0
            ? Math.round(grades.reduce((acc, curr) => acc + curr.score, 0) / grades.length)
            : null;

          return {
            enrollmentId: e.id,
            leadId: e.lead.id,
            fullName: e.lead.fullName,
            phone: e.lead.phone,
            telegramId: e.lead.telegramId,
            averageGrade: avg,
            recentAttendances: attendances,
            recentGrades: grades,
          };
        }),
      })),
    };
  }
}
