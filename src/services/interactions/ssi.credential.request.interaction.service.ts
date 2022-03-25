import { LogContext } from '@common/enums/logging.context';
import { Agent } from '@jolocom/sdk';
import { CredentialRequestFlowState } from '@jolocom/sdk/js/interactionManager/types';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { SignedCredential } from 'jolocom-lib/js/credentials/signedCredential/signedCredential';
import { constraintFunctions } from 'jolocom-lib/js/interactionTokens/credentialRequest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  CacheCredential,
  SystemCredentials,
} from '../credentials/system.credentials';
import { WalletManagerCredentialMetadata } from './dto/wallet.manager.dto.credential.metadata';
import { WalletManagerRequestVcBeginResponse } from './dto/wallet.manager.dto.request.vc.begin.response';
import { WalletManagerRequestVcCompleteResponse } from './dto/wallet.manager.dto.request.vc.complete.response';

export const generateRequirementsFromConfig = ({
  issuer,
  metadata,
}: {
  issuer?: string;
  metadata: { type: string[] };
}) => ({
  type: metadata.type,
  constraints: issuer ? [constraintFunctions.is('issuer', issuer)] : [],
});

@Injectable()
export class SsiCredentialRequestInteractionService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async beginCredentialRequestInteraction(
    agent: Agent,
    credentialMetadata: WalletManagerCredentialMetadata[],
    uniqueCallbackURL: string
  ): Promise<WalletManagerRequestVcBeginResponse> {
    const credentialRequirements = credentialMetadata.map(metadata => {
      return generateRequirementsFromConfig({
        metadata: {
          type: metadata.types,
        },
        issuer: undefined, // add only platform verified issuers
      });
    });

    const token = await agent.credRequestToken({
      callbackURL: uniqueCallbackURL,
      credentialRequirements,
    });

    return {
      interactionId: token.nonce,
      jwt: token.encode(),
      expiresOn: token.expires,
    };
  }

  async completeCredentialRequestInteraction(
    agent: Agent,
    jwt: string
  ): Promise<WalletManagerRequestVcCompleteResponse> {
    const interaction = await agent.processJWT(jwt);
    const credentialState = (await interaction.getSummary()
      .state) as CredentialRequestFlowState;

    const credentials = credentialState.providedCredentials.reduce(
      (aggr, credResponse) => [...aggr, ...credResponse.suppliedCredentials],
      [] as SignedCredential[]
    );

    // eliminate credentials that are invalid
    const verifiedCredentials = [];
    for (const credential of credentials) {
      const isVerified = await agent.credentials.verify(credential);
      if (isVerified) {
        verifiedCredentials.push(credential);
      } else {
        this.logger.warn(
          `Invalid credential provided - ${
            credential.id
          } [${credential.type.join(',')}]`,
          LogContext.SSI
        );
      }
    }

    for (const credential of verifiedCredentials) {
      const jsonCredential = credential.toJSON();
      const serializedCredential = CacheCredential.encode(credential);
      const cacheCredential = await agent.credentials.issue({
        subject: agent.identityWallet.did,
        claim: {
          ...serializedCredential,
        },
        metadata: {
          name: 'Cache credential',
          type: [SystemCredentials.CacheCredential, ...jsonCredential.type],
          context: [CacheCredential.context],
        },
      });

      await agent.storage.store.verifiableCredential(cacheCredential);
    }

    return { result: true };
  }
}
