import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationStatus, MessageSender, TaskType, TaskPriority, TaskStatus } from '@prisma/client';

export interface SendMessageDto {
  conversationId: string;
  senderType: MessageSender;
  content: string;
  metadata?: any;
}

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  // Check if text triggers human handoff
  checkHandoffTriggers(text: string): { needsHandoff: boolean; reason?: string } {
    const lower = text.toLowerCase();

    // 1. Operator / Human request
    const operatorKeywords = ['operator', 'admin', 'odam', 'inson', 'menejer', 'mutaxassis', 'direktor', 'tirik odam'];
    for (const kw of operatorKeywords) {
      if (lower.includes(kw)) {
        return { needsHandoff: true, reason: 'OPERATOR_REQUEST' };
      }
    }

    // 2. Complaint keywords & dissatisfaction
    const complaintKeywords = ['shikoyat', 'noroziman', 'yomon', 'aldov', 'qoniqarsiz', 'pulimni qaytar', 'sudga beraman', 'yoqmadi'];
    for (const kw of complaintKeywords) {
      if (lower.includes(kw)) {
        return { needsHandoff: true, reason: 'COMPLAINT' };
      }
    }

    // 3. Price negotiation / Discounts / Bargaining beyond policy
    const negotiationKeywords = [
      'arzonroq',
      'kelishamizmi',
      'tushib bering',
      'skidka',
      'pulim kam',
      'qilib bera olasizmi',
      'chegirma',
      'aksiya',
      'narxni tushir',
    ];
    for (const kw of negotiationKeywords) {
      if (lower.includes(kw)) {
        return { needsHandoff: true, reason: 'PRICE_NEGOTIATION' };
      }
    }

    // 4. Payment issues / Transaction problems
    const paymentKeywords = ['to\'lovim o\'tmadi', 'karta bo\'yicha muammo', 'pul yechildi', 'to\'lov muammo'];
    for (const kw of paymentKeywords) {
      if (lower.includes(kw)) {
        return { needsHandoff: true, reason: 'PAYMENT_ISSUE' };
      }
    }

    return { needsHandoff: false };
  }

  async findOrCreateForLead(leadId: string, channel = 'TELEGRAM') {
    let conv = await this.prisma.conversation.findFirst({
      where: {
        leadId,
        channel,
        status: { not: ConversationStatus.RESOLVED },
      },
      include: {
        lead: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: {
          leadId,
          channel,
          status: ConversationStatus.AI_HANDLING,
        },
        include: {
          lead: true,
          messages: true,
        },
      });
    }

    return conv;
  }

  async findAll(status?: ConversationStatus) {
    return this.prisma.conversation.findMany({
      where: status ? { status } : undefined,
      include: {
        lead: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        lead: {
          include: { preferredBranch: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conv) throw new NotFoundException('Suhbat topilmadi');
    return conv;
  }

  async triggerHandoff(conversationId: string, reason: string) {
    const conv = await this.findOne(conversationId);

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.NEEDS_HUMAN,
        handoffReason: reason,
        handoffTriggeredAt: new Date(),
      },
    });

    // Create system notification message
    await this.prisma.message.create({
      data: {
        conversationId,
        senderType: MessageSender.SYSTEM,
        content: `[TIZIM]: Suhbat operatorga yo'naltirildi. Sabab: ${reason}. Mutaxassis tez orada javob beradi.`,
      },
    });

    // Create high priority task for admins
    await this.prisma.task.create({
      data: {
        title: `Operatorga murojaat: ${conv.lead.fullName}`,
        description: `Mijoz suhbatda operatorga ulanishni so'radi (${reason}). Chat havolasi: /conversations/${conv.id}`,
        taskType: TaskType.CALL_LEAD,
        priority: TaskPriority.URGENT,
        status: TaskStatus.TODO,
        leadId: conv.lead.id,
      },
    });

    // Record activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: conv.lead.id,
        type: 'SYSTEM',
        title: 'Operatorga uzatildi (Handoff)',
        description: `Mijoz suhbati operatorga o'tkazildi. Sabab: ${reason}`,
      },
    });

    return updated;
  }

  async takeOver(conversationId: string, adminId: string) {
    await this.findOne(conversationId);

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.ADMIN_HANDLING,
        assignedAdminId: adminId,
      },
    });
  }

  async resolve(conversationId: string, resumeAi = false) {
    await this.findOne(conversationId);

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: resumeAi ? ConversationStatus.AI_HANDLING : ConversationStatus.RESOLVED,
        handoffReason: null,
      },
    });
  }

  async addMessage(dto: SendMessageDto) {
    const conv = await this.findOne(dto.conversationId);

    // If user is sending a message and conversation is in AI_HANDLING, check trigger
    if (dto.senderType === MessageSender.USER && conv.status === ConversationStatus.AI_HANDLING) {
      const trigger = this.checkHandoffTriggers(dto.content);
      if (trigger.needsHandoff) {
        await this.triggerHandoff(conv.id, trigger.reason!);
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderType: dto.senderType,
        content: dto.content,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      },
    });

    // Touch conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }
}
