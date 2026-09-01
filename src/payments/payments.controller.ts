import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create.payment.dto';
import { Payment } from './entities/payment.entity';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  getPayment(@Param('id') id: number): string {
    return this.paymentsService.getPayment(id);
  }

  @Post()
  createPayment(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<Partial<Payment>> {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.paymentsService.createPayment(idempotencyKey, createPaymentDto);
  }
}
