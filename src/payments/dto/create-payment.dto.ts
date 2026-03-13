import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    example: 50,
    description: 'Payment amount in major currency units (e.g. 50 = $50.00). Minimum 0.5.',
    minimum: 0.5,
  })
  @IsNumber()
  @Min(0.5)
  amount!: number;

  @ApiProperty({
    example: 'usd',
    description: 'ISO 4217 currency code (e.g. usd, inr, eur)',
  })
  @IsString()
  currency!: string;
}