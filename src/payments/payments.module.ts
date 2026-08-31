import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, IdempotencyKey])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
