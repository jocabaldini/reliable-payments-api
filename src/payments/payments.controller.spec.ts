import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentProvider } from './ports/payment-provider';

describe('PaymentsController', () => {
  let paymentsController: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: {} },
        { provide: PaymentProvider, useValue: {} },
      ],
    }).compile();

    paymentsController = module.get<PaymentsController>(PaymentsController);
  });

  describe('basic tests', () => {
    it('should return "Getting payment #1"', () => {
      expect(paymentsController.getPayment(1)).toBe('Getting payment 1');
    });
  });
});
