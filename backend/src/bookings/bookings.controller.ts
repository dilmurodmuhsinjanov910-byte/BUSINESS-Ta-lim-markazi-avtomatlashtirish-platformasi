import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { BookingsService, CreateBookingDto } from './bookings.service';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingStatus, Role } from '@prisma/client';

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req: any,
    @Query('branchId') branchId?: string,
    @Query('groupId') groupId?: string,
    @Query('status') status?: BookingStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const user = req.user;
    const effectiveBranchId =
      user && user.role !== Role.SUPER_ADMIN && user.role !== Role.OWNER && user.branchId
        ? user.branchId
        : branchId;

    return this.bookingsService.findAll({ branchId: effectiveBranchId, groupId, status, startDate, endDate });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: any) {
    const booking = await this.bookingsService.findOne(id);
    const user = req.user;
    if (
      user &&
      user.role !== Role.SUPER_ADMIN &&
      user.role !== Role.OWNER &&
      user.branchId &&
      booking.branchId !== user.branchId
    ) {
      throw new ForbiddenException('Siz faqat o\'z filialingizga tegishli sinov darslarini ko\'ra olasiz!');
    }
    return booking;
  }

  @Post()
  @RateLimit(15, 60)
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
