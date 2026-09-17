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

  @Post('simulate-trial-request')
  async simulateTrialRequest(@Body() body: { telegramId: string; fullName: string }) {
    return this.telegramService.simulateTrialRequest(body.telegramId, body.fullName);
  }

  @Post('simulate-trial-confirm')
  async simulateTrialConfirm(@Body() body: { telegramId: string; fullName: string; groupId: string }) {
    return this.telegramService.simulateTrialConfirm(body.telegramId, body.fullName, body.groupId);
  }

  @Post('simulate-faq')
  async simulateFaq(@Body() body: { telegramId: string; fullName: string; faqKey: string }) {
    return this.telegramService.simulateFaq(body.telegramId, body.fullName, body.faqKey);
  }
}
