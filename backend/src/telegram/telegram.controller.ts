import { Controller, Post, Body, ForbiddenException, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

import {
  SimulateMessageDto,
  SimulateContactDto,
  SimulateOperatorDto,
  SimulateNameAgeDto,
  SimulateTrialRequestDto,
  SimulateTrialConfirmDto,
  SimulateFaqDto,
} from './dto/simulate-telegram.dto';

@Controller('telegram')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER)
export class TelegramController {
  constructor(private telegramService: TelegramService) {}

  private checkProductionDisabled() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Telegram simulation endpoints are disabled in production environment');
    }
  }

  @Post('simulate')
  async simulate(@Body() body: SimulateMessageDto) {
    this.checkProductionDisabled();
    return this.telegramService.simulateIncomingMessage(body.telegramId, body.fullName, body.text);
  }

  @Post('simulate-contact')
  async simulateContact(@Body() body: SimulateContactDto) {
    this.checkProductionDisabled();
    return this.telegramService.simulateContactShared(body.telegramId, body.phone, body.fullName);
  }

  @Post('simulate-operator')
  async simulateOperator(@Body() body: SimulateOperatorDto) {
    this.checkProductionDisabled();
    return this.telegramService.simulateOperatorRequest(body.telegramId, body.fullName);
  }

  @Post('simulate-name-age')
  async simulateNameAge(@Body() body: SimulateNameAgeDto) {
    this.checkProductionDisabled();
    return this.telegramService.simulateNameAndAgeInput(body.telegramId, body.text);
  }

  @Post('simulate-trial-request')
  async simulateTrialRequest(@Body() body: SimulateTrialRequestDto) {
    this.checkProductionDisabled();
    return this.telegramService.simulateTrialRequest(body.telegramId, body.fullName);
  }

  @Post('simulate-trial-confirm')
  async simulateTrialConfirm(@Body() body: SimulateTrialConfirmDto) {
    this.checkProductionDisabled();
    return this.telegramService.simulateTrialConfirm(body.telegramId, body.fullName, body.groupId);
  }

  @Post('simulate-faq')
  async simulateFaq(@Body() body: SimulateFaqDto) {
    this.checkProductionDisabled();
    return this.telegramService.simulateFaq(body.telegramId, body.fullName, body.faqKey);
  }
}

