import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService, AiProcessInput } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('chat')
  async chat(@Body() body: AiProcessInput) {
    return this.aiService.processUserMessage(body);
  }

  @Post('guardrail-test')
  async testGuardrail(@Body('message') message: string) {
    return this.aiService.detectPromptInjection(message);
  }
}
