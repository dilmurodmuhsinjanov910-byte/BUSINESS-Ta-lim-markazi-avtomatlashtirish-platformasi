import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { LeadSource } from '@prisma/client';

export class CreateOrUpdateLeadDto {
  @IsNotEmpty({ message: 'F.I.SH kiritilishi shart' })
  @IsString({ message: "F.I.SH satr bo'lishi kerak" })
  fullName: string;

  @IsOptional()
  @IsString({ message: "Telefon raqami satr bo'lishi kerak" })
  phone?: string;

  @IsOptional()
  @IsNumber({}, { message: "Yosh butun son bo'lishi kerak" })
  @Min(3, { message: 'Yosh kamida 3 boʻlishi kerak' })
  @Max(120, { message: 'Yosh 120 dan oshmasligi kerak' })
  age?: number;

  @IsOptional()
  @IsString()
  telegramId?: string;

  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @IsOptional()
  @IsEnum(LeadSource, { message: "Noto'g'ri lid manbasi" })
  source?: LeadSource;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  preferredCourse?: string;

  @IsOptional()
  @IsString()
  preferredBranchId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  initialScoreDelta?: number;
}
