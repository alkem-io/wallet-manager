import { MigrationInterface, QueryRunner } from 'typeorm';

export class credential1647257300901 implements MigrationInterface {
  name = 'credential1647257300901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `credentials` CHANGE COLUMN `propertyValue` `propertyValue` VARCHAR(4096) NULL DEFAULT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `credentials` CHANGE COLUMN `propertyValue` `propertyValue` VARCHAR(255) NULL DEFAULT NULL'
    );
  }
}
