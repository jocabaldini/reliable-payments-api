import { PaymentStatus } from '../enums/payment-status.enum';

export interface ResolvedPaymentSummary {
  paymentId: string;
  status: PaymentStatus;
}

export interface StillStuckPaymentSummary {
  paymentId: string;
  error: string;
}

export interface ReconciliationSummary {
  found: number;
  resolved: ResolvedPaymentSummary[];
  stillStuck: StillStuckPaymentSummary[];
}
