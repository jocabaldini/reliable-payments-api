import { Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  getPayment(@Param('id') id: number): string {
    return this.paymentsService.getPayment(id);
  }

  @Post()
  createPayment(): string {
    return this.paymentsService.createPayment({});
  }
}
