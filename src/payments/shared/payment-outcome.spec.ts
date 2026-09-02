import { resolvePaymentOutcome } from './payment-outcome';
import { PaymentProvider } from '../ports/payment-provider';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

describe('resolvePaymentOutcome', () => {
  const basePayment = {
    idempotencyKey: 'key-1',
    amountInCents: 5000,
    currency: 'BRL',
  };

  describe('CREDIT_CARD', () => {
    it('resolves to SUCCEEDED when the provider approves', async () => {
      const authorize = jest.fn().mockResolvedValue({ outcome: 'approved' });
      const generateInstrument = jest.fn();
      const provider: PaymentProvider = { authorize, generateInstrument };

      const outcome = await resolvePaymentOutcome(provider, {
        ...basePayment,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });

      expect(outcome).toEqual({
        status: PaymentStatus.SUCCEEDED,
        failureReason: null,
        instrumentReference: null,
      });
      expect(authorize).toHaveBeenCalledWith({
        providerIdempotencyKey: 'key-1',
        amountInCents: 5000,
        currency: 'BRL',
      });
    });

    it('resolves to FAILED with the provider reason when declined', async () => {
      const authorize = jest
        .fn()
        .mockResolvedValue({ outcome: 'declined', failureReason: 'insufficient_funds' });
      const provider: PaymentProvider = { authorize, generateInstrument: jest.fn() };

      const outcome = await resolvePaymentOutcome(provider, {
        ...basePayment,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });

      expect(outcome).toEqual({
        status: PaymentStatus.FAILED,
        failureReason: 'insufficient_funds',
        instrumentReference: null,
      });
    });

    it('falls back to a default reason when declined without one', async () => {
      const authorize = jest.fn().mockResolvedValue({ outcome: 'declined' });
      const provider: PaymentProvider = { authorize, generateInstrument: jest.fn() };

      const outcome = await resolvePaymentOutcome(provider, {
        ...basePayment,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });

      expect(outcome.failureReason).toBe('declined_without_reason');
    });

    it('never calls generateInstrument for a card payment', async () => {
      const authorize = jest.fn().mockResolvedValue({ outcome: 'approved' });
      const generateInstrument = jest.fn();
      const provider: PaymentProvider = { authorize, generateInstrument };

      await resolvePaymentOutcome(provider, {
        ...basePayment,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });

      expect(generateInstrument).not.toHaveBeenCalled();
    });
  });

  describe.each([PaymentMethod.PIX, PaymentMethod.BOLETO])('%s', (paymentMethod) => {
    it('resolves to PENDING with the issued instrument reference', async () => {
      const authorize = jest.fn();
      const generateInstrument = jest.fn().mockResolvedValue({ instrumentReference: 'instr-abc' });
      const provider: PaymentProvider = { authorize, generateInstrument };

      const outcome = await resolvePaymentOutcome(provider, { ...basePayment, paymentMethod });

      expect(outcome).toEqual({
        status: PaymentStatus.PENDING,
        failureReason: null,
        instrumentReference: 'instr-abc',
      });
      expect(authorize).not.toHaveBeenCalled();
    });
  });
});
