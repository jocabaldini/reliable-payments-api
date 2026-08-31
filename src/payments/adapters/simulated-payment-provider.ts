import {
  AuthorizeCardInput,
  AuthorizeCardResult,
  GenerateInstrumentInput,
  GenerateInstrumentResult,
  PaymentProvider,
} from '../ports/payment-provider';

export const SIMULATED_DECLINE_AMOUNT_IN_CENTS = 66601;
export const SIMULATED_PROVIDER_ERROR_IN_CENTS = 66602;

export class SimulatedPaymentProvider extends PaymentProvider {
  override async authorize(input: AuthorizeCardInput): Promise<AuthorizeCardResult> {
    await Promise.resolve();
    if (input.amountInCents === SIMULATED_DECLINE_AMOUNT_IN_CENTS) {
      return { outcome: 'declined', failureReason: 'simulated_decline' };
    }

    if (input.amountInCents === SIMULATED_PROVIDER_ERROR_IN_CENTS) {
      throw new Error('simulated provider error');
    }

    return { outcome: 'approved' };
  }

  override async generateInstrument(
    input: GenerateInstrumentInput,
  ): Promise<GenerateInstrumentResult> {
    await Promise.resolve();

    if (input.amountInCents === SIMULATED_PROVIDER_ERROR_IN_CENTS) {
      throw new Error('simulated provider error');
    }

    return { instrumentReference: input.providerIdempotencyKey };
  }
}
