import { Payment } from '../entities/payment.entity';

export type PaymentResponseBody = Pick<
  Payment,
  'id' | 'amountInCents' | 'currency' | 'paymentMethod' | 'status' | 'externalReference'
>;

export function toPaymentResponseBody(
  payment: Pick<
    Payment,
    'id' | 'amountInCents' | 'currency' | 'paymentMethod' | 'status' | 'externalReference'
  >,
): PaymentResponseBody {
  return {
    id: payment.id,
    amountInCents: payment.amountInCents,
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    externalReference: payment.externalReference,
  };
}
