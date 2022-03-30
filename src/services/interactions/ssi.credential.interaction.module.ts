import { CacheModule, Module } from '@nestjs/common';
import { SsiAgentModule } from '../agent/ssi.agent.module';
import { SsiCacheCredentialModule } from '../cache.credential/ssi.cache.credential.module';
import { CredentialInteractionController } from './ssi.credential.interaction.controller';
import { SsiCredentialOfferInteractionService } from './ssi.credential.offer.interaction.service';
import { SsiCredentialRequestInteractionService } from './ssi.credential.request.interaction.service';

@Module({
  imports: [SsiAgentModule, SsiCacheCredentialModule, CacheModule.register()],
  providers: [
    SsiCredentialRequestInteractionService,
    SsiCredentialOfferInteractionService,
  ],
  exports: [
    SsiCredentialRequestInteractionService,
    SsiCredentialOfferInteractionService,
  ],
  controllers: [CredentialInteractionController],
})
export class SsiCredentialInteractionModule {}
