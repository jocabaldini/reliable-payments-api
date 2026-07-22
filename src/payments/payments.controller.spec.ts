import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let paymentsController: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [PaymentsService],
    }).compile();

    paymentsController = module.get<PaymentsController>(PaymentsController);
  });

  describe('basic tests', () => {
    it('should return "Getting payment #1"', () => {
      expect(paymentsController.getPayment(1)).toBe('Getting payment 1');
    });
  });
});
