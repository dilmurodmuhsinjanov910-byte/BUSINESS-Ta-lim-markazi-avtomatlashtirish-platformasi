import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsNotEmpty({ message: 'Lid ID kiritilishi shart' })
  @IsString({ message: "Lid ID satr bo'lishi kerak" })
  leadId: string;

  @IsNotEmpty({ message: "To'lov summasi kiritilishi shart" })
  @IsNumber({}, { message: "To'lov summasi son bo'lishi kerak" })
  @IsPositive({ message: "To'lov summasi musbat son bo'lishi kerak" })
  @Min(1000, { message: "To'lov summasi kamida 1,000 so'm bo'lishi kerak" })
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PaymentMethod, { message: "Noto'g'ri to'lov usuli" })
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
