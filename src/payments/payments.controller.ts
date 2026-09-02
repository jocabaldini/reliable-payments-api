import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseBody } from './shared/payment-response';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  getPayment(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentResponseBody> {
    return this.paymentsService.getPayment(id);
  }

  @Post()
  createPayment(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponseBody> {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.paymentsService.createPayment(idempotencyKey, createPaymentDto);
  }
}
