import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { IdempotencyRecordStatus } from '../enums/idempotency-status.enum';

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  idempotencyKey!: string;

  @Column({
    name: 'idempotency_status',
    type: 'enum',
    enum: IdempotencyRecordStatus,
    default: IdempotencyRecordStatus.IN_PROGRESS,
  })
  idempotencyStatus!: IdempotencyRecordStatus;

  @Column({
    name: 'request_fingerprint',
    type: 'varchar',
    length: 64,
  })
  requestFingerprint!: string;

  @Column({
    name: 'response_body',
    type: 'jsonb',
    nullable: true,
  })
  responseBody!: Record<string, unknown> | null;

  @Column({
    name: 'response_status',
    type: 'smallint',
    nullable: true,
  })
  responseStatus!: number | null;

  @Column({
    name: 'amount_in_cents',
    type: 'integer',
  })
  amountInCents!: number;

  @Column({
    type: 'varchar',
    length: 3,
  })
  currency!: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod!: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PROCESSING,
  })
  status!: PaymentStatus;

  @Column({
    name: 'external_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  externalReference!: string | null;

  @Column({
    name: 'failure_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  failureReason!: string | null;

  @Column({
    name: 'instrument_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  instrumentReference!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;
}
