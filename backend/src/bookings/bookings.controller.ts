import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { BookingsService, CreateBookingDto } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingStatus } from '@prisma/client';

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query('branchId') branchId?: string,
    @Query('groupId') groupId?: string,
    @Query('status') status?: BookingStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bookingsService.findAll({ branchId, groupId, status, startDate, endDate });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Post()
  async createBooking(@Body() dto: CreateBookingDto, @Request() req: any) {
    return this.bookingsService.createBooking(dto, req.user?.id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: BookingStatus; reason?: string },
    @Request() req: any,
  ) {
    return this.bookingsService.updateStatus(id, body.status, body.reason, req.user);
  }
}
