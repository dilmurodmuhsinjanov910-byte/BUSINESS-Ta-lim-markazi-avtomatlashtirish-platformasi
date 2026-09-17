import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordGradeDto } from './dto/record-grade.dto';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async recordGrade(dto: RecordGradeDto) {
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
