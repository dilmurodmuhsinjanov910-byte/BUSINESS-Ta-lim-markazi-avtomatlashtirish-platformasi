import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { GroupStatus } from '@prisma/client';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  daysOfWeek?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxStudents?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStudents?: number;

  @IsOptional()
  @IsEnum(GroupStatus)
  status?: GroupStatus;
}
