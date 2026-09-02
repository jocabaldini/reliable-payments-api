import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { IdempotencyRecordStatus } from '../enums/idempotency-status.enum';
import { PaymentOutcome } from './payment-outcome';

export async function finalizePaymentOutcome(
  paymentRepository: Repository<Payment>,
  payment: Pick<
    Payment,
    'id' | 'amountInCents' | 'currency' | 'paymentMethod' | 'externalReference'
  >,
  outcome: PaymentOutcome,
): Promise<Partial<Payment> & Pick<Payment, 'id' | 'status'>> {
  const responseBody: Partial<Payment> & Pick<Payment, 'id' | 'status'> = {
    id: payment.id,
    amountInCents: payment.amountInCents,
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    status: outcome.status,
    externalReference: payment.externalReference,
  };

  // mesmo guard condicional de sempre — protege contra o fluxo original e uma
  // varredura de reconciliação tentando resolver o mesmo Payment ao mesmo tempo.
  await paymentRepository.query(
    `UPDATE payments
       SET status = $1, failure_reason = $2, instrument_reference = $3,
           idempotency_status = $4, response_body = $5, response_status = $6
     WHERE id = $7 AND status = $8`,
    [
      outcome.status,
      outcome.failureReason,
      outcome.instrumentReference,
      IdempotencyRecordStatus.COMPLETED,
      JSON.stringify(responseBody),
      201,
      payment.id,
      PaymentStatus.PROCESSING,
    ],
  );

  return responseBody;
}
