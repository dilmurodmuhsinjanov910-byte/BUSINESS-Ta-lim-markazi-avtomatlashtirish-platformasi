import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ConversationsService, SendMessageDto } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversationStatus, MessageSender } from '@prisma/client';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  async findAll(@Query('status') status?: ConversationStatus) {
    return this.conversationsService.findAll(status);
  }

  @Post()
  async createOrGet(@Body() body: { leadId: string; channel?: string }) {
    return this.conversationsService.findOrCreateForLead(body.leadId, body.channel || 'TELEGRAM');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() body: { content: string; senderType?: MessageSender; metadata?: any },
    @Request() req: any,
  ) {
    return this.conversationsService.addMessage({
      conversationId,
      content: body.content,
      senderType: body.senderType || MessageSender.ADMIN,
      metadata: { ...body.metadata, senderId: req.user?.id, senderName: req.user?.fullName },
    });
  }

  @Post(':id/takeover')
  async takeOver(@Param('id') id: string, @Request() req: any) {
    return this.conversationsService.takeOver(id, req.user.id);
  }

  @Post(':id/resolve')
  async resolve(@Param('id') id: string, @Body() body?: { resumeAi?: boolean }) {
    return this.conversationsService.resolve(id, body?.resumeAi);
  }

  @Post(':id/handoff')
  async manualHandoff(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.conversationsService.triggerHandoff(id, body.reason || 'MANUAL_TAKEOVER');
  }
}
