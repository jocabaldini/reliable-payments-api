import { ConflictException, Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create.payment.dto';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { IdempotencyKey, IdempotencyRecordStatus } from './entities/idempotency-key.entity';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentProvider } from './ports/payment-provider';
import { PaymentMethod } from './enums/payment-method.enum';

interface IdempotencyKeyRow {
  id: string;
  key: string;
  request_fingerprint: string;
  status: IdempotencyRecordStatus;
  response_body: Record<string, unknown> | null;
  response_status: number | null;
  created_at: Date;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Payment) private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyKeyRepository: Repository<IdempotencyKey>,
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

    const claim = await this.dataSource.transaction(async (manager) => {
      const claimed = await manager.query<IdempotencyKeyRow[]>(
        `INSERT INTO idempotency_keys (key, request_fingerprint) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING RETURNING *`,
        [idempotencyKey, fingerprint],
      );

      if (claimed.length === 0) {
        return { won: false as const };
      }

      const paymentRepo = manager.getRepository(Payment);

      const payment = await paymentRepo.save(
        paymentRepo.create({
          amountInCents: data.amountInCents,
          currency: data.currency,
          paymentMethod: data.paymentMethod,
          externalReference: data.externalReference ?? null,
          status: PaymentStatus.PROCESSING,
        }),
      );

      return { won: true as const, payment };
    });

    if (!claim.won) {
      // perdeu — busca o registro existente e ramifica
      // (completed com mesmo fingerprint / in_progress / fingerprint diferente)
      const existing = await this.idempotencyKeyRepository.findOne({
        where: {
          key: idempotencyKey,
        },
      });

      if (!existing) {
        throw new Error('Unexpected empty IdempotencyKey record');
      }

      if (existing.requestFingerprint !== fingerprint) {
        throw new ConflictException({ error: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH' });
      }

      if (IdempotencyRecordStatus.COMPLETED === existing.status) {
        return existing.responseBody as Partial<Payment>;
      }

      throw new ConflictException({ error: 'IDEMPOTENCY_KEY_IN_PROGRESS' });
    }

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

    // transação 2 - aqui mesmo ou entra no if do resultao dos metodos de pagamento?
    return await this.dataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      const payment = claim.payment;
      payment.status = finalStatus;
      payment.failureReason = failureReason;
      payment.instrumentReference = instrumentReference;

      await paymentRepo.save(payment);

      const responseBody: Partial<Payment> = {
        id: payment.id,
        amountInCents: payment.amountInCents,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        externalReference: payment.externalReference,
      };

      await manager.query(
        `UPDATE idempotency_keys SET status = $1, response_body = $2, response_status = $3 where key = $4`,
        [IdempotencyRecordStatus.COMPLETED, JSON.stringify(responseBody), 201, idempotencyKey],
      );

      return responseBody;
    });
  }
}
