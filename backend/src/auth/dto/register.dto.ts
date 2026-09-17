import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsNotEmpty({ message: 'Email kiritilishi shart' })
  @IsEmail({}, { message: "Noto'g'ri email formati" })
  email: string;

  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString({ message: "Parol satr bo'lishi kerak" })
  password: string;

  @IsNotEmpty({ message: 'F.I.SH kiritilishi shart' })
  @IsString({ message: "F.I.SH satr bo'lishi kerak" })
  fullName: string;

  @IsOptional()
  @IsEnum(Role, { message: "Noto'g'ri foydalanuvchi roli" })
  role?: Role;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
