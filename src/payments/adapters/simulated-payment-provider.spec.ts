import {
  SimulatedPaymentProvider,
  SIMULATED_DECLINE_AMOUNT_IN_CENTS,
  SIMULATED_PROVIDER_ERROR_IN_CENTS,
} from './simulated-payment-provider';

describe('SimulatedPaymentProvider', () => {
  let provider: SimulatedPaymentProvider;

  beforeEach(() => {
    provider = new SimulatedPaymentProvider();
  });

  describe('authorize', () => {
    it('approves by default', async () => {
      const result = await provider.authorize({
        providerIdempotencyKey: 'key-1',
        amountInCents: 5000,
        currency: 'BRL',
      });

      expect(result).toEqual({ outcome: 'approved' });
    });

    it('declines when the amount matches the reserved decline value', async () => {
      const result = await provider.authorize({
        providerIdempotencyKey: 'key-1',
        amountInCents: SIMULATED_DECLINE_AMOUNT_IN_CENTS,
        currency: 'BRL',
      });

      expect(result).toEqual({ outcome: 'declined', failureReason: 'simulated_decline' });
    });

    it('throws when the amount matches the reserved provider-error value', async () => {
      await expect(
        provider.authorize({
          providerIdempotencyKey: 'key-1',
          amountInCents: SIMULATED_PROVIDER_ERROR_IN_CENTS,
          currency: 'BRL',
        }),
      ).rejects.toThrow('simulated provider error');
    });
  });

  describe('generateInstrument', () => {
    it('issues an instrument reference derived from the provider idempotency key', async () => {
      const result = await provider.generateInstrument({
        providerIdempotencyKey: 'key-1',
        amountInCents: 5000,
        currency: 'BRL',
      });

      expect(result).toEqual({ instrumentReference: 'key-1' });
    });

    it('throws when the amount matches the reserved provider-error value', async () => {
      await expect(
        provider.generateInstrument({
          providerIdempotencyKey: 'key-1',
          amountInCents: SIMULATED_PROVIDER_ERROR_IN_CENTS,
          currency: 'BRL',
        }),
      ).rejects.toThrow('simulated provider error');
    });
  });

  it('is stateless — consecutive calls with different inputs do not leak into each other', async () => {
    const approved = await provider.authorize({
      providerIdempotencyKey: 'key-1',
      amountInCents: 5000,
      currency: 'BRL',
    });
    const declined = await provider.authorize({
      providerIdempotencyKey: 'key-2',
      amountInCents: SIMULATED_DECLINE_AMOUNT_IN_CENTS,
      currency: 'BRL',
    });
    const approvedAgain = await provider.authorize({
      providerIdempotencyKey: 'key-3',
      amountInCents: 5000,
      currency: 'BRL',
    });

    expect(approved.outcome).toBe('approved');
    expect(declined.outcome).toBe('declined');
    expect(approvedAgain.outcome).toBe('approved');
  });
});
