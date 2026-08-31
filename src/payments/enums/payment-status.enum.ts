/**
 * Kept deliberately small. `processing` is the state where the app has
 * committed to a provider call but doesn't yet know the outcome — see
 * docs/payment-flow.md, section 6, for why that window is the crux of this
 * project. Specific failure reasons (declined, expired, provider_timeout...)
 * belong in Payment.failureReason, not as extra values here.
 */
export enum PaymentStatus {
  PROCESSING = 'processing',
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}
