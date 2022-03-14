import { MigrationInterface, QueryRunner } from 'typeorm';

export class jolocom1647256934309 implements MigrationInterface {
  name = 'joloco21647256934309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `cache` (`key` varchar(255) NOT NULL, `value` text NOT NULL, PRIMARY KEY (`key`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `encrypted_wallet` (`id` varchar(100) NOT NULL, `timestamp` bigint NOT NULL, `encryptedWallet` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `signatures` (`id` int NOT NULL AUTO_INCREMENT, `type` varchar(255) NOT NULL, `created` datetime NOT NULL, `creator` varchar(255) NOT NULL, `nonce` varchar(255) NULL, `signatureValue` varchar(255) NOT NULL, `verifiableCredentialId` varchar(50) NULL, UNIQUE INDEX `IDX_7ff99a380b1f16bea3dc1b3194` (`verifiableCredentialId`, `signatureValue`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `verifiable_credentials` (`@context` text NOT NULL, `id` varchar(50) NOT NULL, `type` text NOT NULL, `name` text NULL, `issuer` varchar(75) NOT NULL, `issued` datetime NOT NULL, `expires` datetime NULL, `subjectId` varchar(100) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `credentials` (`id` int NOT NULL AUTO_INCREMENT, `propertyName` varchar(50) NOT NULL, `propertyValue` varchar(255) NOT NULL, `verifiableCredentialId` varchar(50) NULL, UNIQUE INDEX `IDX_4ec7ab0b5e94c73f31310fd16d` (`verifiableCredentialId`, `propertyName`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `event_log` (`id` varchar(100) NOT NULL, `eventStream` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `identityCache` (`key` varchar(255) NOT NULL, `value` text NOT NULL, PRIMARY KEY (`key`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `interaction_tokens` (`id` int NOT NULL AUTO_INCREMENT, `nonce` varchar(255) NOT NULL, `type` varchar(255) NOT NULL, `issuer` varchar(255) NOT NULL, `timestamp` bigint NOT NULL, `original` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `interactions` (`id` int NOT NULL AUTO_INCREMENT, `nonce` varchar(255) NOT NULL, `type` varchar(255) NOT NULL, `ownerId` varchar(100) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `master_keys` (`encryptedEntropy` varchar(100) NOT NULL, `timestamp` int NOT NULL, PRIMARY KEY (`encryptedEntropy`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `settings` (`key` varchar(255) NOT NULL, `value` text NOT NULL, PRIMARY KEY (`key`)) ENGINE=InnoDB',
      undefined
    );
    await queryRunner.query(
      'ALTER TABLE `signatures` ADD CONSTRAINT `FK_751b7e1a0b6996488fa3bf63ca2` FOREIGN KEY (`verifiableCredentialId`) REFERENCES `verifiable_credentials`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
      undefined
    );
    await queryRunner.query(
      'ALTER TABLE `verifiable_credentials` ADD CONSTRAINT `FK_bc0241a547a24735bb29d43a0af` FOREIGN KEY (`subjectId`) REFERENCES `encrypted_wallet`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
      undefined
    );
    await queryRunner.query(
      'ALTER TABLE `credentials` ADD CONSTRAINT `FK_40a4c92d65d3c6cf200c360b1ce` FOREIGN KEY (`verifiableCredentialId`) REFERENCES `verifiable_credentials`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
      undefined
    );
    await queryRunner.query(
      'ALTER TABLE `interactions` ADD CONSTRAINT `FK_c024e046c5e3894c8e3b3caf9b7` FOREIGN KEY (`ownerId`) REFERENCES `encrypted_wallet`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
      undefined
    );
    await queryRunner.query(
      'CREATE TABLE `jolocom`.`query-result-cache` (`id` int NOT NULL AUTO_INCREMENT, `identifier` varchar(255) NULL, `time` bigint NOT NULL, `duration` int NOT NULL, `query` text NOT NULL, `result` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
      undefined
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE `jolocom`.`query-result-cache`',
      undefined
    );
    await queryRunner.query(
      'ALTER TABLE `interactions` DROP FOREIGN KEY `FK_c024e046c5e3894c8e3b3caf9b7`',
      undefined
    );
    await queryRunner.query(
      'ALTER TABLE `credentials` DROP FOREIGN KEY `FK_40a4c92d65d3c6cf200c360b1ce`',
      undefined
    );
    await queryRunner.query(
      'ALTER TABLE `verifiable_credentials` DROP FOREIGN KEY `FK_bc0241a547a24735bb29d43a0af`',
      undefined
    );
    await queryRunner.query(
      'ALTER TABLE `signatures` DROP FOREIGN KEY `FK_751b7e1a0b6996488fa3bf63ca2`',
      undefined
    );
    await queryRunner.query('DROP TABLE `settings`', undefined);
    await queryRunner.query('DROP TABLE `master_keys`', undefined);
    await queryRunner.query('DROP TABLE `interactions`', undefined);
    await queryRunner.query('DROP TABLE `interaction_tokens`', undefined);
    await queryRunner.query('DROP TABLE `identityCache`', undefined);
    await queryRunner.query('DROP TABLE `event_log`', undefined);
    await queryRunner.query(
      'DROP INDEX `IDX_4ec7ab0b5e94c73f31310fd16d` ON `credentials`',
      undefined
    );
    await queryRunner.query('DROP TABLE `credentials`', undefined);
    await queryRunner.query('DROP TABLE `verifiable_credentials`', undefined);
    await queryRunner.query(
      'DROP INDEX `IDX_7ff99a380b1f16bea3dc1b3194` ON `signatures`',
      undefined
    );
    await queryRunner.query('DROP TABLE `signatures`', undefined);
    await queryRunner.query('DROP TABLE `encrypted_wallet`', undefined);
    await queryRunner.query('DROP TABLE `cache`', undefined);
  }
}
