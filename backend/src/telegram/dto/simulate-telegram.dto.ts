import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SimulateMessageDto {
  @IsNotEmpty()
  @IsString()
  telegramId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fullName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  text: string;
}

export class SimulateContactDto {
  @IsNotEmpty()
  @IsString()
  telegramId: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fullName: string;
}

export class SimulateOperatorDto {
  @IsNotEmpty()
  @IsString()
  telegramId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fullName: string;
}

export class SimulateNameAgeDto {
  @IsNotEmpty()
  @IsString()
  telegramId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  text: string;
}

export class SimulateTrialRequestDto {
  @IsNotEmpty()
  @IsString()
  telegramId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fullName: string;
}

export class SimulateTrialConfirmDto {
  @IsNotEmpty()
  @IsString()
  telegramId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fullName: string;

  @IsNotEmpty()
  @IsString()
  groupId: string;
}

export class SimulateFaqDto {
  @IsNotEmpty()
  @IsString()
  telegramId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fullName: string;

  @IsNotEmpty()
  @IsString()
  faqKey: string;
}
