import { CacheModule, Module } from '@nestjs/common';
import { CredentialConfigAdapterModule } from '@src/application/credential-config-adapter/credential.config.adapter.module';
import { SsiAgentModule } from '../agent/ssi.agent.module';
import { CredentialInteractionController } from './ssi.credential.interaction.controller';
import { SsiCredentialOfferInteractionService } from './ssi.credential.offer.interaction.service';
import { SsiCredentialRequestInteractionService } from './ssi.credential.request.interaction.service';

@Module({
  imports: [
    SsiAgentModule,
    CacheModule.register(),
    CredentialConfigAdapterModule,
  ],
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
