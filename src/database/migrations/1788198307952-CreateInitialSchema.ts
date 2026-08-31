import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1788198307952 implements MigrationInterface {
  name = 'CreateInitialSchema1788198307952';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."idempotency_keys_status_enum" AS ENUM('in_progress', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key" character varying(255) NOT NULL, "request_fingerprint" character varying(64) NOT NULL, "status" "public"."idempotency_keys_status_enum" NOT NULL DEFAULT 'in_progress', "response_body" jsonb, "response_status" smallint, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_idempotency_keys_key" UNIQUE ("key"), CONSTRAINT "PK_8ad20779ad0411107a56e53d0f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_payment_method_enum" AS ENUM('CREDIT_CARD', 'PIX', 'BOLETO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('processing', 'pending', 'succeeded', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "amount_in_cents" integer NOT NULL, "currency" character varying(3) NOT NULL, "payment_method" "public"."payments_payment_method_enum" NOT NULL, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'processing', "external_reference" character varying(255), "failure_reason" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_payment_method_enum"`);
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
    await queryRunner.query(`DROP TYPE "public"."idempotency_keys_status_enum"`);
  }
}
