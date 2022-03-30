import { Module } from '@nestjs/common';
import { SsiAgentService } from './ssi.agent.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SsiCacheCredentialModule } from '../cache.credential/ssi.cache.credential.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(undefined, 'jolocom'),
    SsiCacheCredentialModule,
  ],
  providers: [SsiAgentService],
  exports: [SsiAgentService],
})
export class SsiAgentModule {}
