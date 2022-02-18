/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ConfigurationTypes,
  CREDENTIAL_CONFIG_YML_ADAPTER,
} from '@common/enums';
import { LogContext } from '@common/enums/logging.context';
import { Agent } from '@jolocom/sdk';
import { CredentialRequestFlowState } from '@jolocom/sdk/js/interactionManager/types';
import {
  BadRequestException,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotEnabledException, NotSupportedException } from '@src/common';
import { ICredentialConfigProvider } from '@src/core/contracts/credential.provider.interface';
import { SignedCredential } from 'jolocom-lib/js/credentials/signedCredential/signedCredential';
import { constraintFunctions } from 'jolocom-lib/js/interactionTokens/credentialRequest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  CacheCredential,
  SystemCredentials,
} from '../credentials/system.credentials';
import { BeginCredentialRequestInteractionOutput } from '../interactions/credential.request.interaction';

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
    private configService: ConfigService,
    @Inject(CREDENTIAL_CONFIG_YML_ADAPTER)
    private readonly credentialsProvider: ICredentialConfigProvider
  ) {}

  async beginCredentialRequestInteraction(
    agent: Agent,
    types: string[],
    uniqueCallbackURL: string
  ): Promise<BeginCredentialRequestInteractionOutput> {
    const ssiEnabled = this.configService.get(ConfigurationTypes.IDENTITY).ssi
      .enabled;
    if (!ssiEnabled) {
      throw new NotEnabledException('SSI is not enabled', LogContext.SSI);
    }

    const credentialMetadata =
      this.credentialsProvider.getCredentials().credentials;
    const credentialTypes = types.filter(type =>
      credentialMetadata.find(c => c.uniqueType !== type)
    );

    if (credentialTypes.length === 0)
      throw new BadRequestException('The credential types are not supported');

    const credentialRequirements = credentialTypes.map(credType => {
      const metadata = credentialMetadata.find(c => c.uniqueType === credType);

      if (!metadata) {
        throw new NotSupportedException(
          `Credential type not supported: ${credType}`,
          LogContext.SSI
        );
      }

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

  async completeCredentialShareInteraction(
    agent: Agent,
    jwt: string
  ): Promise<boolean> {
    const ssiEnabled = this.configService.get(ConfigurationTypes.IDENTITY).ssi
      .enabled;
    if (!ssiEnabled) {
      throw new NotEnabledException('SSI is not enabled', LogContext.SSI);
    }

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

    return true;
  }
}
