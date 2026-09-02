import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { IdempotencyRecordStatus } from './enums/idempotency-status.enum';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentProvider } from './ports/payment-provider';
import { resolvePaymentOutcome } from './shared/payment-outcome';
import { finalizePaymentOutcome } from './shared/finalize-payment-outcome';
import { PaymentResponseBody, toPaymentResponseBody } from './shared/payment-response';

interface PaymentRow {
  id: string;
  idempotency_key: string;
  idempotency_status: IdempotencyRecordStatus;
  request_fingerprint: string;
  response_body: Record<string, unknown> | null;
  response_status: number | null;
  amount_in_cents: number;
  currency: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  external_reference: string | null;
  failure_reason: string | null;
  instrument_reference: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepository: Repository<Payment>,
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async getPayment(id: string): Promise<PaymentResponseBody> {
    const payment = await this.paymentRepository.findOne({
      where: {
        id,
      },
    });

    if (!payment) {
      throw new NotFoundException();
    }

    return toPaymentResponseBody(payment);
  }

  async createPayment(
    idempotencyKey: string,
    data: CreatePaymentDto,
  ): Promise<PaymentResponseBody> {
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${data.amountInCents}-${data.currency}-${data.paymentMethod}`)
      .digest('hex');

    // claim + criação do Payment num INSERT só — já é atômico sozinho, não precisa de transaction.
    const claimed = await this.paymentRepository.query<PaymentRow[]>(
      `INSERT INTO payments
         (idempotency_key, request_fingerprint, amount_in_cents, currency, payment_method, external_reference, status, idempotency_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING *`,
      [
        idempotencyKey,
        fingerprint,
        data.amountInCents,
        data.currency,
        data.paymentMethod,
        data.externalReference ?? null,
        PaymentStatus.PROCESSING,
        IdempotencyRecordStatus.IN_PROGRESS,
      ],
    );

    if (claimed.length === 0) {
      // perdeu — busca o Payment existente e ramifica
      const existing = await this.paymentRepository.findOne({ where: { idempotencyKey } });

      if (!existing) {
        throw new Error('Unexpected empty Payment record');
      }

      if (existing.requestFingerprint !== fingerprint) {
        throw new ConflictException({ error: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH' });
      }

      if (existing.idempotencyStatus === IdempotencyRecordStatus.COMPLETED) {
        return existing.responseBody as PaymentResponseBody;
      }

      throw new ConflictException({ error: 'IDEMPOTENCY_KEY_IN_PROGRESS' });
    }

    // claimed[0] existe com certeza — RETURNING * de um INSERT bem-sucedido sempre traz exatamente uma linha.
    const claimedPayment = claimed[0]!;

    const { status, failureReason, instrumentReference } = await resolvePaymentOutcome(
      this.paymentProvider,
      {
        idempotencyKey,
        amountInCents: claimedPayment.amount_in_cents,
        currency: claimedPayment.currency,
        paymentMethod: claimedPayment.payment_method,
      },
    );

    return finalizePaymentOutcome(
      this.paymentRepository,
      {
        id: claimedPayment.id,
        amountInCents: claimedPayment.amount_in_cents,
        currency: claimedPayment.currency,
        paymentMethod: claimedPayment.payment_method,
        externalReference: claimedPayment.external_reference,
      },
      { status, failureReason, instrumentReference },
    );
  }
}
