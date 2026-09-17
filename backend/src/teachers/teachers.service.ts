import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export interface CreateTeacherDto {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  branchId?: string;
}

export interface UpdateTeacherDto {
  fullName?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  branchId?: string;
}

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const teachers = await this.prisma.user.findMany({
      where: {
        role: Role.TEACHER,
      },
      include: {
        branch: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    // Get assigned groups count for each teacher
    const groups = await this.prisma.group.findMany({
      where: {
        teacherId: { not: null },
      },
      select: {
        id: true,
        name: true,
        teacherId: true,
      },
    });

    return teachers.map((t) => {
      const assigned = groups.filter((g) => g.teacherId === t.id);
      return {
        id: t.id,
        fullName: t.fullName,
        email: t.email,
        phone: t.phone || '',
        isActive: t.isActive,
        branchId: t.branchId,
        branchName: t.branch?.name || 'Asosiy filial',
        assignedGroupsCount: assigned.length,
        assignedGroups: assigned.map((g) => g.name),
        createdAt: t.createdAt,
      };
    });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.TEACHER,
      },
      include: {
        branch: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    const assignedGroups = await this.prisma.group.findMany({
      where: { teacherId: id },
      select: { id: true, name: true },
    });

    return {
      id: teacher.id,
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone || '',
      isActive: teacher.isActive,
      branchId: teacher.branchId,
      branchName: teacher.branch?.name || 'Asosiy filial',
      assignedGroupsCount: assignedGroups.length,
      assignedGroups: assignedGroups.map((g) => g.name),
      createdAt: teacher.createdAt,
    };
  }

  async create(dto: CreateTeacherDto) {
    if (!dto.fullName || !dto.phone) {
      throw new BadRequestException("O'qituvchining F.I.SH va telefon raqami talab qilinadi");
    }

    // Auto-generate email if not provided
    const email = dto.email
      ? dto.email.toLowerCase().trim()
      : `teacher_${Date.now()}@al-xorazmiy.uz`;

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException("Bunday email bilan foydalanuvchi allaqachon mavjud");
    }

    const passwordToHash = dto.password || 'Teacher123!';
    const passwordHash = await bcrypt.hash(passwordToHash, 10);

    // If branchId is not provided, use first branch
    let branchId = dto.branchId;
    if (!branchId) {
      const firstBranch = await this.prisma.branch.findFirst();
      branchId = firstBranch?.id;
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone.trim(),
        passwordHash,
        role: Role.TEACHER,
        isActive: true,
        branchId,
      },
      include: {
        branch: true,
      },
    });

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      branchName: user.branch?.name || 'Asosiy filial',
      assignedGroupsCount: 0,
      assignedGroups: [],
      createdAt: user.createdAt,
    };
  }

  async update(id: string, dto: UpdateTeacherDto) {
    await this.findOne(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.phone ? { phone: dto.phone.trim() } : {}),
        ...(dto.email ? { email: dto.email.toLowerCase().trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.branchId ? { branchId: dto.branchId } : {}),
      },
      include: {
        branch: true,
      },
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      isActive: updated.isActive,
      branchName: updated.branch?.name || 'Asosiy filial',
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    // Unassign groups assigned to this teacher
    await this.prisma.group.updateMany({
      where: { teacherId: id },
      data: { teacherId: null },
    });

    try {
      await this.prisma.user.delete({
        where: { id },
      });
      return { success: true, message: "O'qituvchi butunlay o'chirildi", id };
    } catch (e) {
      // If relation prevents hard delete, soft delete
      await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      return { success: true, message: "O'qituvchi faolsizlantirildi", id };
    }
  }
}
