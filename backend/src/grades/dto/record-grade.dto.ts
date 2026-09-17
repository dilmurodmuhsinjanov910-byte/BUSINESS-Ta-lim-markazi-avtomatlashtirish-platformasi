import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { GradeType } from '@prisma/client';

export class RecordGradeDto {
  @IsNotEmpty()
  @IsString()
  enrollmentId: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  score: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxScore?: number;

  @IsOptional()
  @IsEnum(GradeType)
  gradeType?: GradeType;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  markedById?: string;
}
