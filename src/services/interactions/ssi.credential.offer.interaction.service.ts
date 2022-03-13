/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigurationTypes } from '@common/enums';
import { LogContext } from '@common/enums/logging.context';
import { Agent } from '@jolocom/sdk';
import { CredentialOfferFlowState } from '@jolocom/sdk/js/interactionManager/types';
import {
  BadRequestException,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotEnabledException } from '@src/common';
import { constraintFunctions } from 'jolocom-lib/js/interactionTokens/credentialRequest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { generateCredentialOffer } from '../credentials';
import { CredentialMetadataInput } from '../credentials/credential.dto.metadata';
import {
  BeginCredentialOfferInteractionOutput,
  CompleteCredentialOfferInteractionOutput,
} from './credential.offer.interaction';

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
export class SsiCredentialOfferInteractionService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
  ) {}

  async beginCredentialOfferInteraction(
    agent: Agent,
    credentialMetadata: CredentialMetadataInput[],
    uniqueCallbackURL: string
  ): Promise<BeginCredentialOfferInteractionOutput> {
    const token = await agent.credOfferToken({
      callbackURL: uniqueCallbackURL,
      offeredCredentials: credentialMetadata.map(cred =>
        generateCredentialOffer(cred, agent.identityWallet.did)
      ),
    });

    return {
      interactionId: token.nonce,
      jwt: token.encode(),
      expiresOn: token.expires,
    };
  }

  async completeCredentialOfferInteraction(
    agent: Agent,
    jwt: string,
    credentialMetadata: CredentialMetadataInput[],
    claimMap: Record<string, any>
  ): Promise<CompleteCredentialOfferInteractionOutput> {
    const interaction = await agent.processJWT(jwt);
    const credentialState = (await interaction.getSummary()
      .state) as CredentialOfferFlowState;

    const selectedCredentials = credentialState.selectedTypes.reduce(
      (aggr, credType) => {
        const targetCredential = credentialMetadata.find(
          c => c.uniqueType === credType
        );
        if (!targetCredential) {
          return aggr;
        }

        const offer: (inp?: any) => Promise<{
          claim: any;
          metadata?: any;
          subject?: string;
        }> = async () => {
          return {
            subject: interaction.participants.responder?.did,
            claim: claimMap[credType],
            metadata: {
              type: targetCredential.types,
              name: targetCredential.name,
              context: [targetCredential.context],
            },
          };
        };
        return {
          ...aggr,
          [credType]: offer,
        };
      },
      {}
    );

    const credentials = await interaction.issueSelectedCredentials(
      selectedCredentials
    );

    const offerToken = await interaction.createCredentialReceiveToken(
      credentials
    );

    return {
      interactionId: offerToken.nonce,
      token: offerToken.encode(),
    };
  }
}
