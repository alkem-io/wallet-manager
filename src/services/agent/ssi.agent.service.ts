/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigurationTypes } from '@common/enums';
import { LogContext } from '@common/enums/logging.context';
import { JolocomSDK } from '@jolocom/sdk';
import { JolocomTypeormStorage } from '@jolocom/sdk-storage-typeorm';
import { CredentialOfferFlowState } from '@jolocom/sdk/js/interactionManager/types';
import { CredentialQuery, IStorage } from '@jolocom/sdk/js/storage';
import {
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
  LoggerService,
  PreconditionFailedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/typeorm';
import { NotEnabledException } from '@src/common';
import { Agent } from '@src/types/agent';
import { VerifiedCredential } from '@src/types/verified.credential';
import { Cache } from 'cache-manager';
import { constraintFunctions } from 'jolocom-lib/js/interactionTokens/credentialRequest';
import { CredentialOfferRequestAttrs } from 'jolocom-lib/js/interactionTokens/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Connection } from 'typeorm';
import CredentialMetadata from '../credentials';
import { RecognizedCredentials } from '../credentials/recongized.credentials';
import stateModificationMetadata from '../credentials/state.modification.credential.metadata';
import {
  CredentialShareRequestDTO,
  CredentialShareResponseDTO,
  StoreSharedCredentialsDTO,
} from '../interactions/credential.request.interaction';

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
export class SsiAgentService {
  private jolocomSDK: JolocomSDK;

  constructor(
    @InjectConnection('jolocom')
    private typeormConnection: Connection,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache
  ) {
    const storage: IStorage = new JolocomTypeormStorage(this.typeormConnection);
    this.jolocomSDK = new JolocomSDK({ storage });
  }

  async createAgent(password: string): Promise<string> {
    const agent = await this.jolocomSDK.createAgent(password, 'jun');
    return agent.identityWallet.did;
  }

  async loadDidDoc(did: string, password: string): Promise<string> {
    const agent = await this.jolocomSDK.loadAgent(password, did);
    const didDocAttrs = agent.identityWallet.didDocument.toJSON();
    const didDocAttrsJson = JSON.stringify(didDocAttrs, null, 2);
    return didDocAttrsJson;
  }

  async getVerifiedCredentials(
    did: string,
    password: string
  ): Promise<VerifiedCredential[]> {
    const credentialsResult: VerifiedCredential[] = [];
    const agent = await this.jolocomSDK.loadAgent(password, did);
    const query: CredentialQuery = {};
    const credentials = await agent.credentials.query(query);
    for (const credential of credentials) {
      const claim = credential.claim;
      const verifiedCredential: VerifiedCredential = {
        claim: JSON.stringify(claim),
        issuer: credential.issuer,
        type: credential.type[1],
        issued: credential.issued,
      };
      credentialsResult.push(verifiedCredential);
      this.logger.verbose?.(
        `${JSON.stringify(credential.claim)}`,
        LogContext.AUTH
      );
    }
    return credentialsResult;
  }

  async grantStateTransitionVC(
    issuerDid: string,
    issuerPW: string,
    receiverDid: string,
    receiverPw: string,
    challengeID: string,
    userID: string
  ): Promise<boolean> {
    const issuerAgent = await this.jolocomSDK.loadAgent(issuerPW, issuerDid);
    const receiverAgent = await this.jolocomSDK.loadAgent(
      receiverPw,
      receiverDid
    );

    this.logger.verbose?.('About to issue a credential...', LogContext.SSI);

    // Issuer creates the offer to receiver to sign a simple credential
    const offer: CredentialOfferRequestAttrs = {
      callbackURL: 'https://example.com/issuance',
      offeredCredentials: [
        {
          type: RecognizedCredentials.StateModificationCredential,
        },
      ],
    };
    const issuerCredOffer = await issuerAgent.credOfferToken(offer);

    // Receiver gets and processes the offered token, to identify the relevant Interaction
    const receiverCredExchangeInteraction = await receiverAgent.processJWT(
      issuerCredOffer.encode()
    );

    // Receiver then creates a response token
    const receiverCredExchangeResponse =
      await receiverCredExchangeInteraction.createCredentialOfferResponseToken([
        { type: RecognizedCredentials.StateModificationCredential },
      ]);

    // Note that all agents need to also process the tokens they generate so that their interaction manager has seen all messages
    await receiverAgent.processJWT(receiverCredExchangeResponse.encode());

    // Issuer receives the token response from Receiver, finds the interaction + then creates the VC to share
    const issuerCredExchangeInteraction = await issuerAgent.processJWT(
      receiverCredExchangeResponse.encode()
    );

    // Create the VC that then will be issued by Alice to Bob, so that Bob can then prove that Alice attested to this credential about him.
    const issuerAboutReceiverVC = await issuerAgent.signedCredential({
      metadata: stateModificationMetadata,
      subject: receiverAgent.identityWallet.did,
      claim: {
        challengeID: challengeID,
        userID: userID,
      },
    });

    // Create the token wrapping the VC
    const aliceCredIssuance =
      await issuerCredExchangeInteraction.createCredentialReceiveToken([
        issuerAboutReceiverVC,
      ]);
    // Issuer processes her own generated token also
    await issuerAgent.processJWT(aliceCredIssuance.encode());

    // Token with signed VC is sent and received by Bob
    const receiverCredExchangeInteraction2 = await receiverAgent.processJWT(
      aliceCredIssuance.encode()
    );
    const state = receiverCredExchangeInteraction2.getSummary()
      .state as CredentialOfferFlowState;

    if (state.credentialsAllValid) {
      this.logger.verbose?.('Issued credential interaction is valid!');
      await receiverCredExchangeInteraction2.storeSelectedCredentials();
    }

    return true;
  }

  async authorizeStateModification(
    issuingAgent: Agent,
    issuingResourceID: string,
    receivingAgent: Agent,
    receivingResourceID: string
  ): Promise<boolean> {
    const ssiEnabled = this.configService.get(ConfigurationTypes.IDENTITY).ssi
      .enabled;
    if (!ssiEnabled) {
      throw new NotEnabledException('SSI is not enabled', LogContext.SSI);
    }

    await this.grantStateTransitionVC(
      issuingAgent.did,
      issuingAgent.password,
      receivingAgent.did,
      receivingAgent.password,
      issuingResourceID,
      receivingResourceID
    );
    return true;
  }

  async grantCredential(payload: any): Promise<boolean> {
    return false;
  }

  // buildPublicHttpUrl(
  //   path: string,
  //   publicHostport?: string,
  //   tlsEnabled?: boolean
  // ) {
  //   const protocol = tlsEnabled ? 'https' : 'http';
  //   const root = publicHostport || 'localhost';
  //   return `${protocol}://${root}${path}`;
  // }

  // buildInteractionUrl(
  //   path: string,
  //   publicHostport?: string,
  //   tlsEnabled?: boolean
  // ) {
  //   return `${this.buildPublicHttpUrl(
  //     path,
  //     publicHostport,
  //     tlsEnabled
  //   )}/interxn/${v4()}`;
  // }

  async generateCredentialShareRequest(
    payload: CredentialShareRequestDTO
  ): Promise<CredentialShareResponseDTO> {
    const ssiEnabled = this.configService.get(ConfigurationTypes.IDENTITY).ssi
      .enabled;
    if (!ssiEnabled) {
      throw new NotEnabledException('SSI is not enabled', LogContext.SSI);
    }

    const { types, uniqueCallbackURL, issuerDId, issuerPassword } = payload;

    const credentialTypes = types.filter(type => CredentialMetadata[type]);

    if (credentialTypes.length === 0)
      throw new BadRequestException('The credential types are not supported');

    const issuerAgent = await this.jolocomSDK.loadAgent(
      issuerPassword,
      issuerDId
    );

    const credentialRequirements = credentialTypes.map(credType =>
      generateRequirementsFromConfig({
        metadata: CredentialMetadata[credType],
        issuer: undefined, // add only platform verified issuers
      })
    );

    const token = await issuerAgent.credRequestToken({
      callbackURL: uniqueCallbackURL,
      credentialRequirements,
    });

    const expiresOn = new Date();
    expiresOn.setSeconds(900);
    this.cacheManager.set<CredentialShareRequestDTO>(
      token.nonce,
      payload,
      { ttl: 900 } // 15 mins
    );

    return {
      interactionId: token.nonce,
      jwt: token.encode(),
      expiresOn: expiresOn.getTime(),
    };
  }

  async storeSharedCredentials(
    payload: StoreSharedCredentialsDTO
  ): Promise<boolean> {
    const ssiEnabled = this.configService.get(ConfigurationTypes.IDENTITY).ssi
      .enabled;
    if (!ssiEnabled) {
      throw new NotEnabledException('SSI is not enabled', LogContext.SSI);
    }

    const { offererDId, offererPassword, interactionId, jwt } = payload;

    const request = await this.cacheManager.get<CredentialShareRequestDTO>(
      interactionId
    );

    if (!request) {
      throw new PreconditionFailedException(
        `The interactionId could not be found: ${interactionId}`
      );
    }

    const issuerAgent = await this.jolocomSDK.loadAgent(
      request.issuerPassword,
      request.issuerDId
    );

    const interaction = await issuerAgent.processJWT(jwt);
    const credentials = await interaction.getVerifiableCredential();

    const offererAgent = await this.jolocomSDK.loadAgent(
      offererPassword,
      offererDId
    );

    for (const credential of credentials) {
      await offererAgent.storage.store.verifiableCredential(credential);
    }

    return true;
  }
}
