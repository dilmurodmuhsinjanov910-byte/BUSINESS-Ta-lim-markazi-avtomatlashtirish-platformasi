import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AiService, AiProcessInput } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
  async chat(@Body() body: AiProcessInput) {
    return this.aiService.processUserMessage(body);
  }

  @Post('guardrail-test')
  async testGuardrail(@Body('message') message: string) {
    return this.aiService.detectPromptInjection(message);
  }
}
