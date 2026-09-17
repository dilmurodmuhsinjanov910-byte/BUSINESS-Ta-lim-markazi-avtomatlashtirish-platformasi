import { IsNotEmpty, IsOptional, IsNumber, IsString } from 'class-validator';

export class CreateEnrollmentDto {
  @IsNotEmpty()
  @IsString()
  leadId: string;

  @IsNotEmpty()
  @IsString()
  groupId: string;

  @IsOptional()
  @IsNumber()
  monthlyFee?: number;
}
