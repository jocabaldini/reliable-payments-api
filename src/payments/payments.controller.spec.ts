import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentResponseBody } from './shared/payment-response';

describe('PaymentsController', () => {
  let paymentsController: PaymentsController;
  let paymentsService: { getPayment: jest.Mock; createPayment: jest.Mock };

  const responseBody: PaymentResponseBody = {
    id: 'payment-id',
    amountInCents: 5000,
    currency: 'BRL',
    paymentMethod: PaymentMethod.CREDIT_CARD,
    status: PaymentStatus.SUCCEEDED,
    externalReference: null,
  };

  beforeEach(async () => {
    paymentsService = {
      getPayment: jest.fn(),
      createPayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    }).compile();

    paymentsController = module.get<PaymentsController>(PaymentsController);
  });

  describe('getPayment', () => {
    it('delegates to the service with the id from the route', async () => {
      paymentsService.getPayment.mockResolvedValue(responseBody);

      const result = await paymentsController.getPayment('payment-id');

      expect(paymentsService.getPayment).toHaveBeenCalledWith('payment-id');
      expect(result).toBe(responseBody);
    });
  });

  describe('createPayment', () => {
    const dto: CreatePaymentDto = {
      amountInCents: 5000,
      currency: 'BRL',
      paymentMethod: PaymentMethod.CREDIT_CARD,
    };

    it('rejects with 400 when the Idempotency-Key header is missing', () => {
      expect(() => paymentsController.createPayment('', dto)).toThrow(BadRequestException);
      expect(paymentsService.createPayment).not.toHaveBeenCalled();
    });

    it('delegates to the service with the header and body when present', async () => {
      paymentsService.createPayment.mockResolvedValue(responseBody);

      const result = await paymentsController.createPayment('key-1', dto);

      expect(paymentsService.createPayment).toHaveBeenCalledWith('key-1', dto);
      expect(result).toBe(responseBody);
    });
  });
});
