import { Payment } from '../entities/payment.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentProvider } from '../ports/payment-provider';

export interface PaymentOutcome {
  status: PaymentStatus;
  failureReason: string | null;
  instrumentReference: string | null;
}

export async function resolvePaymentOutcome(
  provider: PaymentProvider,
  payment: Pick<Payment, 'idempotencyKey' | 'amountInCents' | 'currency' | 'paymentMethod'>,
): Promise<PaymentOutcome> {
  const { idempotencyKey, amountInCents, currency, paymentMethod } = payment;
  const providerInput = {
    providerIdempotencyKey: idempotencyKey,
    amountInCents,
    currency,
  };

  const paymentOutcome = {
    status: PaymentStatus.PENDING,
    failureReason: null,
    instrumentReference: null,
  } as PaymentOutcome;

  if (paymentMethod === PaymentMethod.CREDIT_CARD) {
    const result = await provider.authorize(providerInput);
    if (result.outcome === 'approved') {
      paymentOutcome.status = PaymentStatus.SUCCEEDED;
      return paymentOutcome;
    }

    paymentOutcome.status = PaymentStatus.FAILED;
    paymentOutcome.failureReason = result.failureReason ?? 'declined_without_reason';
    return paymentOutcome;
  }

  const result = await provider.generateInstrument(providerInput);
  paymentOutcome.instrumentReference = result.instrumentReference;
  return paymentOutcome;
}
