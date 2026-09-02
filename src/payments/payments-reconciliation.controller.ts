import { Controller, Post, Query } from '@nestjs/common';
import { PaymentsReconciliationService } from './payments-reconciliation.service';
import { ReconciliationSummary } from './dto/reconciliation-summary.dto';

@Controller('admin/payments/reconcile')
export class PaymentsReconciliationController {
  constructor(private readonly paymentsReconciliationService: PaymentsReconciliationService) {}

  @Post()
  reconcilePayment(@Query('olderThanMs') olderThanMs?: string): Promise<ReconciliationSummary> {
    const threshold = olderThanMs ? Number(olderThanMs) : 30_000;
    return this.paymentsReconciliationService.reconciliatePayments(threshold);
  }
}
