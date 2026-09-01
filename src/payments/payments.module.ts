import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { PaymentProvider } from './ports/payment-provider';
import { SimulatedPaymentProvider } from './adapters/simulated-payment-provider';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, IdempotencyKey])],
  controllers: [PaymentsController],
  providers: [PaymentsService, { provide: PaymentProvider, useClass: SimulatedPaymentProvider }],
})
export class PaymentsModule {}
