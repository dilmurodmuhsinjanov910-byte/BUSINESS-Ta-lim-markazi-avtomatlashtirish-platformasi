import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly = true) {
    return this.prisma.course.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        _count: {
          select: { groups: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        groups: {
          include: { branch: true },
        },
      },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    return course;
  }

  async create(data: {
    name: string;
    description?: string;
    language: string;
    level: string;
    monthlyPrice: number;
    durationMonths?: number;
    lessonsPerWeek?: number;
    lessonDurationMinutes?: number;
    isActive?: boolean;
  }) {
    return this.prisma.course.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.course.update({
      where: { id },
      data,
    });
  }

  // Helper method for AI orchestrator to fetch verified price list
  async getVerifiedCatalog() {
    const courses = await this.prisma.course.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        language: true,
        level: true,
        monthlyPrice: true,
        durationMonths: true,
        lessonsPerWeek: true,
        lessonDurationMinutes: true,
        description: true,
      },
    });

    return courses.map((c) => ({
      id: c.id,
      name: c.name,
      language: c.language,
      level: c.level,
      priceFormatted: `${c.monthlyPrice.toLocaleString()} UZS/oy`,
      monthlyPrice: c.monthlyPrice,
      duration: `${c.durationMonths} oy, haftada ${c.lessonsPerWeek} kun (${c.lessonDurationMinutes} daqiqa)`,
      description: c.description,
    }));
  }
}
