import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { GroupStatus } from '@prisma/client';

export class CreateGroupDto {
  @IsNotEmpty({ message: 'Guruh nomi kiritilishi shart' })
  @IsString({ message: "Guruh nomi satr bo'lishi kerak" })
  name: string;

  @IsNotEmpty({ message: 'Kurs ID kiritilishi shart' })
  @IsString({ message: "Kurs ID satr bo'lishi kerak" })
  courseId: string;

  @IsNotEmpty({ message: 'Filial ID kiritilishi shart' })
  @IsString({ message: "Filial ID satr bo'lishi kerak" })
  branchId: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsNotEmpty({ message: 'Dars kunlari kiritilishi shart' })
  @IsString({ message: "Dars kunlari satr bo'lishi kerak" })
  daysOfWeek: string;

  @IsNotEmpty({ message: 'Boshlanish vaqti kiritilishi shart' })
  @IsString({ message: "Boshlanish vaqti satr bo'lishi kerak" })
  startTime: string;

  @IsNotEmpty({ message: 'Tugash vaqti kiritilishi shart' })
  @IsString({ message: "Tugash vaqti satr bo'lishi kerak" })
  endTime: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @IsNumber({}, { message: "Maksimal o'quvchilar soni raqam bo'lishi kerak" })
  @Min(1, { message: "Maksimal o'quvchilar soni kamida 1 bo'lishi kerak" })
  maxStudents?: number;

  @IsOptional()
  @IsNumber({}, { message: "Joriy o'quvchilar soni raqam bo'lishi kerak" })
  @Min(0)
  currentStudents?: number;

  @IsOptional()
  @IsEnum(GroupStatus, { message: "Noto'g'ri guruh holati" })
  status?: GroupStatus;
}
