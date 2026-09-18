import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PaymentsService, CreatePaymentDto } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaymentStatus, Role } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('summary')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async getSummary() {
    return this.paymentsService.getSummary();
  }

  @Get('debtors')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async getDebtors() {
    return this.paymentsService.getDebtors();
  }

  @Get(':id/receipt')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async getReceipt(@Param('id') id: string) {
    return this.paymentsService.getReceipt(id);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async findAll(@Query('status') status?: PaymentStatus) {
    return this.paymentsService.findAll(status);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async create(@Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.paymentsService.create(dto, req.user?.id);
  }

  @Post('direct-pay')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createAndPay(@Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.paymentsService.createAndPay(dto, req.user?.id);
  }

  @Post('notify-debtor/:leadId')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async notifyDebtor(@Param('leadId') leadId: string, @Request() req: any) {
    return this.paymentsService.notifyDebtor(leadId, req.user?.id);
  }

  @Put(':id/pay')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async markAsPaid(@Param('id') id: string, @Request() req: any) {
    return this.paymentsService.markAsPaid(id, req.user?.id);
  }
}
