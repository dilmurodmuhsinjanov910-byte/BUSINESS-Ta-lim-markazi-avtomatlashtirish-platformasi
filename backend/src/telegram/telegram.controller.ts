import { Controller, Post, Body } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private telegramService: TelegramService) {}

  @Post('simulate')
  async simulate(@Body() body: { telegramId: string; fullName: string; text: string }) {
    return this.telegramService.simulateIncomingMessage(body.telegramId, body.fullName, body.text);
  }
}
