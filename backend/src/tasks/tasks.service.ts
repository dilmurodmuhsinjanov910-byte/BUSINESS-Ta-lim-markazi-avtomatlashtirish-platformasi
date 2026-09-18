import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskType, TaskPriority, TaskStatus } from '@prisma/client';

import { IsNotEmpty, IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty({ message: 'Vazifa sarlavhasi kiritilishi shart' })
  @IsString({ message: "Vazifa sarlavhasi satr bo'lishi kerak" })
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNotEmpty()
  @IsEnum(TaskType)
  taskType: TaskType;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  dueDate?: string | Date;
}

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    taskType?: TaskType;
    assignedToId?: string;
    leadId?: string;
  }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.priority) where.priority = params.priority;
    if (params?.taskType) where.taskType = params.taskType;
    if (params?.assignedToId) where.assignedToId = params.assignedToId;
    if (params?.leadId) where.leadId = params.leadId;

    return this.prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        lead: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        lead: true,
      },
    });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    return task;
  }

  async create(dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        taskType: dto.taskType,
        priority: dto.priority || TaskPriority.MEDIUM,
        assignedToId: dto.assignedToId,
        leadId: dto.leadId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: TaskStatus.TODO,
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    if (data.status === TaskStatus.DONE && !data.completedAt) {
      data.completedAt = new Date();
    }
    return this.prisma.task.update({
      where: { id },
      data,
    });
  }
}
