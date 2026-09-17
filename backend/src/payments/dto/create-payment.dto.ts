import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsNotEmpty({ message: 'Lid ID kiritilishi shart' })
  @IsString({ message: "Lid ID satr bo'lishi kerak" })
  leadId: string;

  @IsNotEmpty({ message: "To'lov summasi kiritilishi shart" })
  @IsNumber({}, { message: "To'lov summasi son bo'lishi kerak" })
  @Min(0, { message: "To'lov summasi manfiy bo'lishi mumkin emas" })
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PaymentMethod, { message: "Noto'g'ri to'lov usuli" })
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}
