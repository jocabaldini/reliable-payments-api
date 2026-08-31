/**
 * E2E spec for POST /payments — written against docs/payment-flow.md.
 *
 * This is written before the implementation exists (TDD). It won't compile or
 * run cleanly until the following exist:
 *
 *   - `payments` gains `payment_method` and `status` columns (migration)
 *   - a new `idempotency_keys` table (migration): key (unique), fingerprint,
 *     status, response, http_status, timestamps
 *   - PaymentsController reads the `Idempotency-Key` header and a validated body
 *   - a global (or route-level) ValidationPipe rejecting malformed payloads with 400
 *   - PaymentsService implementing the atomic-claim flow (payment-flow.md, section 5)
 *   - conflict responses shaped as `{ error: 'IDEMPOTENCY_KEY_...' }`, e.g. via
 *     `throw new ConflictException({ error: 'IDEMPOTENCY_KEY_IN_PROGRESS', message: '...' })`
 *
 * Requires the docker-compose Postgres running locally (`docker compose up -d`).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

jest.setTimeout(30000);

/**
 * supertest types `Response.body` as `any` — it has no way to know our API's
 * shape. These describe what this endpoint actually returns, so the rest of
 * the file can access response fields without leaking `any` past the HTTP
 * boundary. Once a real response DTO exists on the controller side, these can
 * be replaced by importing that type instead of duplicating it here.
 */
interface PaymentResponseBody {
  id: string;
  amountInCents: number;
  currency: string;
  paymentMethod: string;
  status: string;
  externalReference: string | null;
}

interface ConflictResponseBody {
  error: string;
  message?: string;
}

/**
 * `DataSource.query` is `any` unless given a type argument. Also centralizes
 * the repeated "count rows" pattern that showed up three times in this file.
 */
async function countRows(
  dataSource: DataSource,
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  const rows = await dataSource.query<{ count: string }[]>(sql, params);
  // COUNT(*) with no GROUP BY always returns exactly one row.
  return Number(rows[0]!.count);
}

describe('Payments creation (e2e)', () => {
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
    await dataSource.query('TRUNCATE TABLE payments, idempotency_keys CASCADE');
  });

  const validBody = () => ({
    amountInCents: 5000,
    currency: 'BRL',
    paymentMethod: 'CREDIT_CARD',
    externalReference: 'order-123',
  });

  describe('happy path', () => {
    it('creates a CREDIT_CARD payment and resolves it synchronously', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Idempotency-Key', randomUUID())
        .send(validBody())
        .expect(201);
      const body = response.body as PaymentResponseBody;

      expect(body).toMatchObject({
        amountInCents: 5000,
        currency: 'BRL',
        paymentMethod: 'CREDIT_CARD',
        externalReference: 'order-123',
      });
      expect(body.id).toBeDefined();
      expect(['succeeded', 'failed']).toContain(body.status);
    });

    it.each(['PIX', 'BOLETO'])('creates a %s payment as pending', async (paymentMethod) => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Idempotency-Key', randomUUID())
        .send({ ...validBody(), paymentMethod })
        .expect(201);
      const body = response.body as PaymentResponseBody;

      expect(body.status).toBe('pending');
    });
  });

  describe('idempotent replay', () => {
    it('returns an identical response on retry with the same key and payload', async () => {
      const key = randomUUID();
      const body = validBody();

      const first = await request(app.getHttpServer())
        .post('/payments')
        .set('Idempotency-Key', key)
        .send(body)
        .expect(201);
      const firstBody = first.body as PaymentResponseBody;

      const second = await request(app.getHttpServer())
        .post('/payments')
        .set('Idempotency-Key', key)
        .send(body)
        .expect(201);
      const secondBody = second.body as PaymentResponseBody;

      expect(secondBody).toEqual(firstBody);

      const count = await countRows(dataSource, 'SELECT COUNT(*) FROM payments WHERE id = $1', [
        firstBody.id,
      ]);
      expect(count).toBe(1);
    });
  });

  describe('key reuse with a different payload', () => {
    it('rejects with 409 and creates nothing new', async () => {
      const key = randomUUID();

      await request(app.getHttpServer())
        .post('/payments')
        .set('Idempotency-Key', key)
        .send(validBody())
        .expect(201);

      const conflict = await request(app.getHttpServer())
        .post('/payments')
        .set('Idempotency-Key', key)
        .send({ ...validBody(), amountInCents: 9999 })
        .expect(409);
      const conflictBody = conflict.body as ConflictResponseBody;

      expect(conflictBody.error).toBe('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');

      const count = await countRows(dataSource, 'SELECT COUNT(*) FROM payments');
      expect(count).toBe(1);
    });
  });

  describe('invalid payload', () => {
    it('rejects with 400 without consuming the idempotency key', async () => {
      const key = randomUUID();

      await request(app.getHttpServer())
        .post('/payments')
        .set('Idempotency-Key', key)
        .send({ amountInCents: 5000 }) // missing currency and paymentMethod
        .expect(400);

      // same key, now with a valid payload — must succeed normally.
      // proves the invalid attempt never claimed the key (payment-flow.md, 9.4/decision made in step 2)
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Idempotency-Key', key)
        .send(validBody())
        .expect(201);
      const body = response.body as PaymentResponseBody;

      expect(body.id).toBeDefined();
    });
  });

  describe('concurrent requests with the same key', () => {
    it('results in exactly one payment, however each response resolves', async () => {
      const key = randomUUID();
      const body = validBody();

      const responses = await Promise.all(
        Array.from({ length: 8 }).map(() =>
          request(app.getHttpServer()).post('/payments').set('Idempotency-Key', key).send(body),
        ),
      );

      // every response must be either a 201 (created live, or replayed) or the
      // documented in-progress conflict — nothing else is a valid outcome
      for (const res of responses) {
        const isCreatedOrReplayed = res.status === 201;
        const isInProgress =
          res.status === 409 &&
          (res.body as ConflictResponseBody).error === 'IDEMPOTENCY_KEY_IN_PROGRESS';
        expect(isCreatedOrReplayed || isInProgress).toBe(true);
      }

      // whoever got a 201, live or replayed, must have gotten the same payment
      const ids = new Set(
        responses.filter((r) => r.status === 201).map((r) => (r.body as PaymentResponseBody).id),
      );
      expect(ids.size).toBe(1);

      const count = await countRows(dataSource, 'SELECT COUNT(*) FROM payments');
      expect(count).toBe(1);
    });
  });
});
