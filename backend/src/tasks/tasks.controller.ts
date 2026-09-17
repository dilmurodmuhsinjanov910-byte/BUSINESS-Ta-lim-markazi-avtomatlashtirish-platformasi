import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TasksService, CreateTaskDto } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  async findAll(
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('taskType') taskType?: TaskType,
    @Query('assignedToId') assignedToId?: string,
    @Query('leadId') leadId?: string,
  ) {
    return this.tasksService.findAll({ status, priority, taskType, assignedToId, leadId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.tasksService.update(id, data);
  }
}
