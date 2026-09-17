import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditDto {
  entityType: string;
  entityId: string;
  action: string;
  changedById?: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(dto: RecordAuditDto) {
    return this.prisma.auditLog.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        action: dto.action,
        changedById: dto.changedById,
        oldValue: dto.oldValue ? JSON.stringify(dto.oldValue) : null,
        newValue: dto.newValue ? JSON.stringify(dto.newValue) : null,
        reason: dto.reason,
      },
    });
  }

  async findAll(params?: { entityType?: string; entityId?: string; limit?: number }) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType: params?.entityType,
        entityId: params?.entityId,
      },
      include: {
        changedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: params?.limit || 50,
    });
  }
}
