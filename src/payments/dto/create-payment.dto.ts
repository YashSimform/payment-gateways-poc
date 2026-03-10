import { IsNumber, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0.5)
  amount!: number;

  @IsString()
  currency!: string;
}