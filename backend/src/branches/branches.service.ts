import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly = false) {
    return this.prisma.branch.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        _count: {
          select: {
            groups: true,
            leads: true,
            trialBookings: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        organization: true,
        groups: {
          include: {
            course: true,
          },
        },
      },
    });
    if (!branch) throw new NotFoundException('Filial topilmadi');
    return branch;
  }

  async create(data: {
    organizationId: string;
    name: string;
    address: string;
    phone: string;
    latitude?: number;
    longitude?: number;
    isActive?: boolean;
  }) {
    return this.prisma.branch.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.branch.update({
      where: { id },
      data,
    });
  }
}
