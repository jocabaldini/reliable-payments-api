import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { LessThan, Repository } from 'typeorm';
import { PaymentProvider } from './ports/payment-provider';
import { PaymentStatus } from './enums/payment-status.enum';
import { resolvePaymentOutcome } from './shared/payment-outcome';
import { finalizePaymentOutcome } from './shared/finalize-payment-outcome';
import {
  ReconciliationSummary,
  ResolvedPaymentSummary,
  StillStuckPaymentSummary,
} from './dto/reconciliation-summary.dto';

@Injectable()
export class PaymentsReconciliationService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepository: Repository<Payment>,
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async reconciliatePayments(olderThanMs: number): Promise<ReconciliationSummary> {
    const threshold = new Date(Date.now() - olderThanMs);
    const stuckPayments = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.PROCESSING,
        updatedAt: LessThan(threshold),
      },
    });

    const results = await Promise.allSettled(
      stuckPayments.map(async (payment) => {
        const outcome = await resolvePaymentOutcome(this.paymentProvider, payment);
        return finalizePaymentOutcome(this.paymentRepository, payment, outcome);
      }),
    );

    const resolved: Array<ResolvedPaymentSummary> = [];
    const stillStuck: Array<StillStuckPaymentSummary> = [];

    results.forEach((result, index) => {
      const payment = stuckPayments[index]!;

      if (result.status === 'fulfilled') {
        resolved.push({ paymentId: payment.id, status: result.value.status });
      } else {
        const error =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        stillStuck.push({ paymentId: payment.id, error });
      }
    });

    return {
      found: resolved.length + stillStuck.length,
      resolved,
      stillStuck,
    };
  }
}
