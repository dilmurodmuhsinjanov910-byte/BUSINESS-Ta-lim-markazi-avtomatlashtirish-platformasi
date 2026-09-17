import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        branches: true,
      },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { branches: true },
    });
    if (!org) throw new NotFoundException('Tashkilot topilmadi');
    return org;
  }

  async create(data: { name: string; legalName?: string; phone?: string; email?: string; address?: string }) {
    return this.prisma.organization.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; legalName: string; phone: string; email: string; address: string }>) {
    await this.findOne(id);
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }
}
