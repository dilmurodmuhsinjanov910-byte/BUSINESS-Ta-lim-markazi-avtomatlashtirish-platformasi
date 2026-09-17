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

  @Get()
  async findAll(@Query('status') status?: PaymentStatus) {
    return this.paymentsService.findAll(status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async create(@Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.paymentsService.create(dto, req.user.id);
  }

  @Put(':id/pay')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async markAsPaid(@Param('id') id: string, @Request() req: any) {
    return this.paymentsService.markAsPaid(id, req.user.id);
  }
}
