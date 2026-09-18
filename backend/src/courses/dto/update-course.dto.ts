import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

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
