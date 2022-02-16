import { CacheModule, Module } from '@nestjs/common';
import { SsiAgentModule } from '../agent/ssi.agent.module';
import { CredentialInteractionController } from './ssi.credential.interaction.controller';
import { SsiCredentialRequestInteractionService } from './ssi.credential.request.interaction.service';

@Module({
  imports: [SsiAgentModule, CacheModule.register()],
  providers: [SsiCredentialRequestInteractionService],
  exports: [SsiCredentialRequestInteractionService],
  controllers: [CredentialInteractionController],
})
export class SsiCredentialInteractionModule {}
