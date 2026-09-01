import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTablePaymentsAddInstrumentReference1788274824287 implements MigrationInterface {
  name = 'AlterTablePaymentsAddInstrumentReference1788274824287';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "instrument_reference" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "instrument_reference"`);
  }
}
