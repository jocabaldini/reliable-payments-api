import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreatePaymentDto {
  @IsInt()
  amountInCents!: number;

  @IsString()
  currency!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  externalReference?: string;
}
