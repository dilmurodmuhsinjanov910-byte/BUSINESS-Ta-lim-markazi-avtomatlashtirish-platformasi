import { Controller, Post, Get, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { AiService, AiProcessInput } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/guards/rate-limit.guard';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('tools')
  getTools() {
    return this.aiService.getTools();
  }

  @Post('tool-call')
  @UseGuards(JwtAuthGuard)
  async executeTool(@Body() body: { toolName: string; args?: any }) {
    return this.aiService.executeTool(body.toolName, body.args || {});
  }

  @Post('chat')
  @RateLimit(20, 60)
  async chat(@Body() body: AiProcessInput) {
    if (body.toolCall) {
      throw new ForbiddenException(
        "To'g'ridan-to'g'ri tool chaqirish uchun autentifikatsiya talab qilinadi. Himoyalangan /api/ai/tool-call endpointidan foydalaning",
      );
    }
    return this.aiService.processUserMessage(body);
  }

  @Post('guardrail-test')
  async testGuardrail(@Body('message') message: string) {
    return this.aiService.detectPromptInjection(message);
  }
}
