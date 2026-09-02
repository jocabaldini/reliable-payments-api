import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ReconciliationSummary } from '../src/payments/dto/reconciliation-summary.dto';
import { SIMULATED_PROVIDER_ERROR_IN_CENTS } from '../src/payments/adapters/simulated-payment-provider';

jest.setTimeout(30000);

interface StuckPaymentOverrides {
  amountInCents?: number;
  ageMs?: number;
  status?: string;
}

async function insertPayment(
  dataSource: DataSource,
  overrides: StuckPaymentOverrides = {},
): Promise<{ id: string; idempotencyKey: string }> {
  const idempotencyKey = randomUUID();
  const amountInCents = overrides.amountInCents ?? 5000;
  const status = overrides.status ?? 'processing';
  const updatedAt = new Date(Date.now() - (overrides.ageMs ?? 60_000));

  const rows = await dataSource.query<{ id: string }[]>(
    `INSERT INTO payments
       (idempotency_key, request_fingerprint, amount_in_cents, currency, payment_method, status, created_at, updated_at)
     VALUES ($1, 'test-fingerprint', $2, 'BRL', 'CREDIT_CARD', $3, $4, $4)
     RETURNING id`,
    [idempotencyKey, amountInCents, status, updatedAt],
  );

  return { id: rows[0]!.id, idempotencyKey };
}

async function getPaymentStatus(dataSource: DataSource, id: string): Promise<string> {
  const rows = await dataSource.query<{ status: string }[]>(
    'SELECT status FROM payments WHERE id = $1',
    [id],
  );
  return rows[0]!.status;
}

describe('Payments reconciliation (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE payments CASCADE');
  });

  const reconcile = (olderThanMs?: number) =>
    request(app.getHttpServer())
      .post('/admin/payments/reconcile')
      .query(olderThanMs === undefined ? {} : { olderThanMs })
      .expect(201);

  it('resolves a genuinely stuck payment and reports it', async () => {
    const { id } = await insertPayment(dataSource, { ageMs: 60_000 });

    const response = await reconcile(0);
    const summary = response.body as ReconciliationSummary;

    expect(summary.found).toBe(1);
    expect(summary.resolved).toHaveLength(1);
    expect(summary.resolved[0]!.paymentId).toBe(id);
    expect(summary.stillStuck).toHaveLength(0);

    const status = await getPaymentStatus(dataSource, id);
    expect(status).not.toBe('processing');
  });

  it('ignores a processing payment that is not old enough yet', async () => {
    await insertPayment(dataSource, { ageMs: 1_000 });

    const response = await reconcile(60_000);
    const summary = response.body as ReconciliationSummary;

    expect(summary.found).toBe(0);
  });

  it('ignores payments that are not processing, regardless of age', async () => {
    await insertPayment(dataSource, { ageMs: 60_000, status: 'succeeded' });

    const response = await reconcile(0);
    const summary = response.body as ReconciliationSummary;

    expect(summary.found).toBe(0);
  });

  it('leaves a payment as processing and reports it when the provider fails again', async () => {
    const { id } = await insertPayment(dataSource, {
      ageMs: 60_000,
      amountInCents: SIMULATED_PROVIDER_ERROR_IN_CENTS,
    });

    const response = await reconcile(0);
    const summary = response.body as ReconciliationSummary;

    expect(summary.found).toBe(1);
    expect(summary.resolved).toHaveLength(0);
    expect(summary.stillStuck).toHaveLength(1);
    expect(summary.stillStuck[0]!.paymentId).toBe(id);
    expect(summary.stillStuck[0]!.error).toBeTruthy();

    const status = await getPaymentStatus(dataSource, id);
    expect(status).toBe('processing');
  });

  it('defaults olderThanMs when the query param is omitted', async () => {
    await insertPayment(dataSource, { ageMs: 1_000 });

    const response = await reconcile();
    const summary = response.body as ReconciliationSummary;

    // 1s old, default threshold is 30s — should not be picked up
    expect(summary.found).toBe(0);
  });
});
