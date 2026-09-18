import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleStatus } from '@prisma/client';

import { IsNotEmpty, IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class CreateArticleDto {
  @IsNotEmpty({ message: 'Maqola sarlavhasi kiritilishi shart' })
  @IsString({ message: "Maqola sarlavhasi satr bo'lishi kerak" })
  @MaxLength(200)
  title: string;

  @IsNotEmpty({ message: 'Kategoriya kiritilishi shart' })
  @IsString({ message: "Kategoriya satr bo'lishi kerak" })
  @MaxLength(100)
  category: string;

  @IsNotEmpty({ message: 'Maqola mazmuni kiritilishi shart' })
  @IsString({ message: "Maqola mazmuni satr bo'lishi kerak" })
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tags?: string;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}

@Injectable()
export class KnowledgeBaseService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: ArticleStatus, category?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    return this.prisma.knowledgeBaseArticle.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Critical requirement: AI queries ONLY PUBLISHED articles
  async getPublishedArticles(category?: string) {
    const where: any = { status: ArticleStatus.PUBLISHED };
    if (category) where.category = category;

    return this.prisma.knowledgeBaseArticle.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        content: true,
        tags: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { id },
    });
    if (!article) throw new NotFoundException('Maqola topilmadi');

    // Increment view count
    await this.prisma.knowledgeBaseArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return article;
  }

  async create(dto: CreateArticleDto) {
    return this.prisma.knowledgeBaseArticle.create({
      data: {
        title: dto.title,
        category: dto.category.toUpperCase(),
        content: dto.content,
        tags: dto.tags,
        status: dto.status || ArticleStatus.DRAFT,
      },
    });
  }

  async update(id: string, data: Partial<CreateArticleDto>) {
    await this.findOne(id);
    return this.prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        ...data,
        category: data.category ? data.category.toUpperCase() : undefined,
      },
    });
  }

  // Soft delete / archive
  async archive(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.knowledgeBaseArticle.update({
      where: { id },
      data: { status: ArticleStatus.ARCHIVED },
    });

    if (this.prisma.auditLog?.create) {
      await this.prisma.auditLog.create({
        data: {
          entityType: 'KnowledgeBase',
          entityId: id,
          action: 'ARCHIVE',
          reason: 'Maqola arxivlandi va AI bazasidan chiqarildi',
        },
      }).catch(() => {});
    }

    return updated;
  }

  async publish(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.knowledgeBaseArticle.update({
      where: { id },
      data: { status: ArticleStatus.PUBLISHED },
    });

    if (this.prisma.auditLog?.create) {
      await this.prisma.auditLog.create({
        data: {
          entityType: 'KnowledgeBase',
          entityId: id,
          action: 'PUBLISH',
          reason: 'Maqola nashr qilindi va AI bazasiga kiritildi',
        },
      }).catch(() => {});
    }

    return updated;
  }
}
