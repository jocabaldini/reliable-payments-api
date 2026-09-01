import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { CreatePaymentDto } from './dto/create.payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { IdempotencyRecordStatus } from './enums/idempotency-status.enum';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentProvider } from './ports/payment-provider';

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

  getPayment(id: number): string {
    return `Getting payment ${id}`;
  }

  async createPayment(idempotencyKey: string, data: CreatePaymentDto): Promise<Partial<Payment>> {
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
        return existing.responseBody as Partial<Payment>;
      }

      throw new ConflictException({ error: 'IDEMPOTENCY_KEY_IN_PROGRESS' });
    }

    // claimed[0] existe com certeza — RETURNING * de um INSERT bem-sucedido sempre traz exatamente uma linha.
    const claimedPayment = claimed[0]!;

    const providerInput = {
      providerIdempotencyKey: idempotencyKey,
      amountInCents: data.amountInCents,
      currency: data.currency,
    };
    let finalStatus: PaymentStatus;
    let failureReason: string | null = null;
    let instrumentReference: string | null = null;

    if (data.paymentMethod === PaymentMethod.CREDIT_CARD) {
      const result = await this.paymentProvider.authorize(providerInput);
      if (result.outcome === 'approved') {
        finalStatus = PaymentStatus.SUCCEEDED;
      } else {
        finalStatus = PaymentStatus.FAILED;
        failureReason = result.failureReason ?? 'declined_without_reason';
      }
    } else {
      const result = await this.paymentProvider.generateInstrument(providerInput);
      finalStatus = PaymentStatus.PENDING;
      instrumentReference = result.instrumentReference;
    }

    const responseBody: Partial<Payment> = {
      id: claimedPayment.id,
      amountInCents: claimedPayment.amount_in_cents,
      currency: claimedPayment.currency,
      paymentMethod: claimedPayment.payment_method,
      status: finalStatus,
      externalReference: claimedPayment.external_reference,
    };

    // update final — de novo, uma linha, uma instrução, atômico sozinho. O `AND status = PROCESSING`
    // é a proteção contra o item 12 (reconciliação) tentando resolver o mesmo Payment ao mesmo tempo.
    await this.paymentRepository.query(
      `UPDATE payments
         SET status = $1, failure_reason = $2, instrument_reference = $3,
             idempotency_status = $4, response_body = $5, response_status = $6
       WHERE id = $7 AND status = $8`,
      [
        finalStatus,
        failureReason,
        instrumentReference,
        IdempotencyRecordStatus.COMPLETED,
        JSON.stringify(responseBody),
        201,
        claimedPayment.id,
        PaymentStatus.PROCESSING,
      ],
    );

    return responseBody;
  }
}
