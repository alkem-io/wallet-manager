import { Module } from '@nestjs/common';
import { SsiAgentService } from './ssi.agent.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialConfigAdapterModule } from '@src/application/credential-config-adapter/credential.config.adapter.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(undefined, 'jolocom'),
    CredentialConfigAdapterModule,
  ],
  providers: [SsiAgentService],
  exports: [SsiAgentService],
})
export class SsiAgentModule {}
