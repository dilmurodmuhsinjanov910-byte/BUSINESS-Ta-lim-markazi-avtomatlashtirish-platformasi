import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { KnowledgeBaseService, CreateArticleDto } from './knowledge-base.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ArticleStatus, Role } from '@prisma/client';

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private kbService: KnowledgeBaseService) {}

  @Get()
  async findAll(@Query('status') status?: ArticleStatus, @Query('category') category?: string) {
    return this.kbService.findAll(status, category);
  }

  @Get('published')
  async getPublished(@Query('category') category?: string) {
    return this.kbService.getPublishedArticles(category);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.kbService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async create(@Body() dto: CreateArticleDto) {
    return this.kbService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async update(@Param('id') id: string, @Body() data: Partial<CreateArticleDto>) {
    return this.kbService.update(id, data);
  }

  @Put(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async publish(@Param('id') id: string) {
    return this.kbService.publish(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async archive(@Param('id') id: string) {
    return this.kbService.archive(id);
  }
}
