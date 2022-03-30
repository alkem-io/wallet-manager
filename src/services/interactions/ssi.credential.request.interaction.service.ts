import { LogContext } from '@common/enums/logging.context';
import { Agent } from '@jolocom/sdk';
import { CredentialRequestFlowState } from '@jolocom/sdk/js/interactionManager/types';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { SignedCredential } from 'jolocom-lib/js/credentials/signedCredential/signedCredential';
import { constraintFunctions } from 'jolocom-lib/js/interactionTokens/credentialRequest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CacheCredentialService } from '../cache.credential/ssi.cache.credential.service';
import { SystemCredentials } from '../credentials/system.credentials';
import { WalletManagerCredentialMetadata } from './dto/wallet.manager.dto.credential.metadata';
import { WalletManagerSovrhdCredential } from './dto/wallet.manager.dto.credential.sovrhd';
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
    private readonly logger: LoggerService,
    private cacheCredentialService: CacheCredentialService
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

  async completeCredentialRequestInteractionJolocom(
    agent: Agent,
    jwt: string
  ): Promise<WalletManagerRequestVcCompleteResponse> {
    this.logger.verbose?.(
      `Storing credential - ${jwt.substring(0, 30)}...`,
      LogContext.SSI
    );
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
      const serializedCredential =
        this.cacheCredentialService.encode(credential);
      const cacheCredential = await agent.credentials.issue({
        subject: agent.identityWallet.did,
        claim: {
          ...serializedCredential,
        },
        metadata: {
          name: 'Cache credential',
          type: [SystemCredentials.CacheCredential, ...jsonCredential.type],
          context: [this.cacheCredentialService.getContext()],
        },
      });

      await agent.storage.store.verifiableCredential(cacheCredential);
    }

    return { result: true };
  }

  async completeCredentialRequestInteractionSovrhd(
    agent: Agent,
    sovrhdCredStr: string,
    credentialType: string
  ): Promise<WalletManagerRequestVcCompleteResponse> {
    const sovrhdCred: WalletManagerSovrhdCredential = JSON.parse(sovrhdCredStr);
    this.logger.verbose?.(
      `Storing Sovrhd credential - ${sovrhdCredStr}`,
      LogContext.SSI
    );

    const serializedCredential = this.cacheCredentialService.encodeSovrhd(
      sovrhdCred,
      credentialType
    );

    const cacheCredential = await agent.credentials.issue({
      subject: agent.identityWallet.did,
      claim: {
        ...serializedCredential,
      },
      metadata: {
        name: 'Cache credential',
        type: [SystemCredentials.CacheCredential, ...sovrhdCred.type],
        context: [this.cacheCredentialService.getContext()],
      },
    });

    await agent.storage.store.verifiableCredential(cacheCredential);

    return { result: true };
  }
}
