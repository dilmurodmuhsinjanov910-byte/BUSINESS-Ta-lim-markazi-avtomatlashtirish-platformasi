import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateBranchDto {
  @IsNotEmpty({ message: 'Tashkilot ID kiritilishi shart' })
  @IsString({ message: "Tashkilot ID satr bo'lishi kerak" })
  organizationId: string;

  @IsNotEmpty({ message: 'Filial nomi kiritilishi shart' })
  @IsString({ message: "Filial nomi satr bo'lishi kerak" })
  name: string;

  @IsNotEmpty({ message: 'Filial manzili kiritilishi shart' })
  @IsString({ message: "Filial manzili satr bo'lishi kerak" })
  address: string;

  @IsNotEmpty({ message: 'Telefon raqami kiritilishi shart' })
  @IsString({ message: "Telefon raqami satr bo'lishi kerak" })
  phone: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
