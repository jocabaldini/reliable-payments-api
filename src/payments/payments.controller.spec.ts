import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { PaymentProvider } from './ports/payment-provider';

describe('PaymentsController', () => {
  let paymentsController: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        { provide: DataSource, useValue: {} },
        { provide: getRepositoryToken(Payment), useValue: {} },
        { provide: getRepositoryToken(IdempotencyKey), useValue: {} },
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
