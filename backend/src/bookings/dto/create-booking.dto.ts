import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty({ message: 'Lid ID kiritilishi shart' })
  @IsString({ message: "Lid ID satr bo'lishi kerak" })
  leadId: string;

  @IsNotEmpty({ message: 'Guruh ID kiritilishi shart' })
  @IsString({ message: "Guruh ID satr bo'lishi kerak" })
  groupId: string;

  @IsNotEmpty({ message: 'Bron sanasi kiritilishi shart' })
  bookingDate: string | Date;

  @IsOptional()
  @IsString({ message: "Izoh satr bo'lishi kerak" })
  notes?: string;
}
