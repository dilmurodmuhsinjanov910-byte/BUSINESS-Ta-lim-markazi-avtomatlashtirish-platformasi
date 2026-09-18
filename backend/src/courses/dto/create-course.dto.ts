import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateCourseDto {
  @IsNotEmpty({ message: 'Kurs nomi kiritilishi shart' })
  @IsString({ message: "Kurs nomi satr bo'lishi kerak" })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Til kiritilishi shart' })
  @IsString({ message: "Til satr bo'lishi kerak" })
  language: string;

  @IsNotEmpty({ message: 'Daraja kiritilishi shart' })
  @IsString({ message: "Daraja satr bo'lishi kerak" })
  level: string;

  @IsNotEmpty({ message: 'Oylik narx kiritilishi shart' })
  @IsNumber({}, { message: "Oylik narx son bo'lishi kerak" })
  @Min(0, { message: "Oylik narx manfiy bo'lishi mumkin emas" })
  monthlyPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  lessonsPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  lessonDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
