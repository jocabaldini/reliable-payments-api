import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveIdempotencyIntoPayments1788295032072 implements MigrationInterface {
  name = 'MoveIdempotencyIntoPayments1788295032072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
    await queryRunner.query(`DROP TYPE "public"."idempotency_keys_status_enum"`);

    await queryRunner.query(
      `ALTER TABLE "payments" ADD "idempotency_key" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "UQ_59dcef70bd19850783c84f840e5" UNIQUE ("idempotency_key")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_idempotency_status_enum" AS ENUM('in_progress', 'completed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "idempotency_status" "public"."payments_idempotency_status_enum" NOT NULL DEFAULT 'in_progress'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "request_fingerprint" character varying(64) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "payments" ADD "response_body" jsonb`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "response_status" smallint`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "response_status"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "response_body"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "request_fingerprint"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "idempotency_status"`);
    await queryRunner.query(`DROP TYPE "public"."payments_idempotency_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "UQ_59dcef70bd19850783c84f840e5"`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "idempotency_key"`);

    await queryRunner.query(
      `CREATE TYPE "public"."idempotency_keys_status_enum" AS ENUM('in_progress', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key" character varying(255) NOT NULL, "request_fingerprint" character varying(64) NOT NULL, "status" "public"."idempotency_keys_status_enum" NOT NULL DEFAULT 'in_progress', "response_body" jsonb, "response_status" smallint, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_idempotency_keys_key" UNIQUE ("key"), CONSTRAINT "PK_8ad20779ad0411107a56e53d0f6" PRIMARY KEY ("id"))`,
    );
  }
}
