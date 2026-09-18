import { IsNotEmpty, IsOptional, IsNumber, IsString, Min } from 'class-validator';

export class CreateEnrollmentDto {
  @IsNotEmpty()
  @IsString()
  leadId: string;

  @IsNotEmpty()
  @IsString()
  groupId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyFee?: number;
}
