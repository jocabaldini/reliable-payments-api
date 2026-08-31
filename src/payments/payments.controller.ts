import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create.payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  getPayment(@Param('id') id: number): string {
    return this.paymentsService.getPayment(id);
  }

  @Post()
  createPayment(
    @Headers('Idempotency-Key') IdempotencyKey: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ): string {
    return this.paymentsService.createPayment(createPaymentDto);
  }
}
