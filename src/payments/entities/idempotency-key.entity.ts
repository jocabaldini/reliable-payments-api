import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum IdempotencyRecordStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

/**
 * One row per Idempotency-Key ever claimed. `status` stays `in_progress` for
 * the full window between claiming the key and knowing the outcome of the
 * (possibly slow, possibly failed) provider call — see payment-flow.md,
 * section 6. A concurrent request that finds this record while it's still
 * `in_progress` gets IDEMPOTENCY_KEY_IN_PROGRESS, not a wait.
 */
@Entity({ name: 'idempotency_keys' })
@Unique('UQ_idempotency_keys_key', ['key'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  key!: string;

  @Column({
    name: 'request_fingerprint',
    type: 'varchar',
    length: 64, // sha-256 hex digest of the relevant payload fields
  })
  requestFingerprint!: string;

  @Column({
    type: 'enum',
    enum: IdempotencyRecordStatus,
    default: IdempotencyRecordStatus.IN_PROGRESS,
  })
  status!: IdempotencyRecordStatus;

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

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}
