import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email kiritilishi shart' })
  @IsEmail({}, { message: "Noto'g'ri email formati" })
  email: string;

  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString({ message: "Parol satr bo'lishi kerak" })
  password: string;
}
