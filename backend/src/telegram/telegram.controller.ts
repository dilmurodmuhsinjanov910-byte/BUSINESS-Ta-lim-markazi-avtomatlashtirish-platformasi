import { Controller, Post, Body } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private telegramService: TelegramService) {}

  @Post('simulate')
  async simulate(@Body() body: { telegramId: string; fullName: string; text: string }) {
    return this.telegramService.simulateIncomingMessage(body.telegramId, body.fullName, body.text);
  }

  @Post('simulate-contact')
  async simulateContact(@Body() body: { telegramId: string; phone: string; fullName: string }) {
    return this.telegramService.simulateContactShared(body.telegramId, body.phone, body.fullName);
  }

  @Post('simulate-operator')
  async simulateOperator(@Body() body: { telegramId: string; fullName: string }) {
    return this.telegramService.simulateOperatorRequest(body.telegramId, body.fullName);
  }

  @Post('simulate-name-age')
  async simulateNameAge(@Body() body: { telegramId: string; text: string }) {
    return this.telegramService.simulateNameAndAgeInput(body.telegramId, body.text);
  }
}
