import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentProvider } from './ports/payment-provider';
import { SimulatedPaymentProvider } from './adapters/simulated-payment-provider';
import { PaymentsReconciliationController } from './payments-reconciliation.controller';
import { PaymentsReconciliationService } from './payments-reconciliation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentsController, PaymentsReconciliationController],
  providers: [
    PaymentsService,
    PaymentsReconciliationService,
    { provide: PaymentProvider, useClass: SimulatedPaymentProvider },
  ],
})
export class PaymentsModule {}
