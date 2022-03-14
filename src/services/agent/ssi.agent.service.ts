/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigurationTypes } from '@common/enums';
import { LogContext } from '@common/enums/logging.context';
import { Agent, JolocomSDK } from '@jolocom/sdk';
import { JolocomTypeormStorage } from '@jolocom/sdk-storage-typeorm';
import { CredentialOfferFlowState } from '@jolocom/sdk/js/interactionManager/types';
import { CredentialQuery, IStorage } from '@jolocom/sdk/js/storage';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/typeorm';
import { NotSupportedException } from '@src/common/exceptions/not.supported.exception';
import { Agent as AlkemioAgent } from '@src/types/agent';
import { VerifiedCredential } from '@src/types/verified.credential';
import { constraintFunctions } from 'jolocom-lib/js/interactionTokens/credentialRequest';
import { CredentialOfferRequestAttrs } from 'jolocom-lib/js/interactionTokens/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Connection } from 'typeorm';
import { CacheCredential, SystemCredentials } from '../credentials';
import { CredentialMetadataInput } from '../credentials/credential.dto.metadata';

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
  private didMethod: string;
  private allowedDidMethods = ['jolo', 'jun'];

  constructor(
    @InjectConnection('jolocom')
    private typeormConnection: Connection,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
  ) {
    const storage: IStorage = new JolocomTypeormStorage(this.typeormConnection);
    this.jolocomSDK = new JolocomSDK({ storage });

    this.didMethod = this.configService.get(ConfigurationTypes.JOLOCOM).method;
    if (!this.allowedDidMethods.includes(this.didMethod))
      throw new NotSupportedException(
        `Invalid did method type encountered: ${this.didMethod}`,
        LogContext.SSI
      );
  }

  async createAgent(password: string): Promise<string> {
    const agent = await this.jolocomSDK.createAgent(password, this.didMethod);
    return agent.identityWallet.did;
  }

  async loadAgent(did: string, password: string): Promise<Agent> {
    return await this.jolocomSDK.loadAgent(password, did);
  }

  async loadDidDoc(did: string, password: string): Promise<string> {
    const agent = await this.jolocomSDK.loadAgent(password, did);
    const didDocAttrs = agent.identityWallet.didDocument.toJSON();
    const didDocAttrsJson = JSON.stringify(didDocAttrs, null, 2);
    return didDocAttrsJson;
  }

  async getVerifiedCredentials(
    did: string,
    password: string,
    credentialMetadata: CredentialMetadataInput[]
  ): Promise<VerifiedCredential[]> {
    const credentialsResult: VerifiedCredential[] = [];
    const agent = await this.jolocomSDK.loadAgent(password, did);
    const query: CredentialQuery = {};
    const credentials = await agent.credentials.query(query);
    for (const credential of credentials) {
      const claim = credential.claim;
      const metadata = credentialMetadata.find(
        c => credential.type.indexOf(c.uniqueType) !== -1
      );
      const context = metadata?.context || credential.context;
      const name = credential.name; // metadata?.name

      let verifiedCredential: VerifiedCredential = {
        claim: JSON.stringify(claim),
        issuer: credential.issuer,
        type: credential.type[credential.type.length - 1],
        issued: credential.issued,
        expires: credential.expires,
        context: JSON.stringify(context),
        name: name,
      };

      try {
        // TODO isolate logic in wrap/unwrap methods for CachedCredentials
        if (credential.type.indexOf(SystemCredentials.CacheCredential) !== -1) {
          const signedCredential = CacheCredential.decode(
            credential.claim as any
          );

          verifiedCredential = {
            claim: JSON.stringify(signedCredential.claim),
            issuer: signedCredential.issuer,
            type: signedCredential.type[signedCredential.type.length - 1],
            issued: signedCredential.issued,
            expires: credential.expires,
            context: JSON.stringify(context),
            name: signedCredential.name,
          };
        }

        credentialsResult.push(verifiedCredential);
        this.logger.verbose?.(
          `${JSON.stringify(verifiedCredential.claim)}`,
          LogContext.AUTH
        );
      } catch (error) {
        this.logger.error(
          `Unable to retrieve credential '${credential.type}': ${error}`,
          LogContext.SSI
        );
      }
    }
    return credentialsResult;
  }

  // TODO Clean this up
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
          type: 'TODO', //RecognizedCredentials.StateModificationCredential,
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
        { type: 'RecognizedCredentials.StateModificationCredential' },
      ]);

    // Note that all agents need to also process the tokens they generate so that their interaction manager has seen all messages
    await receiverAgent.processJWT(receiverCredExchangeResponse.encode());

    // Issuer receives the token response from Receiver, finds the interaction + then creates the VC to share
    const issuerCredExchangeInteraction = await issuerAgent.processJWT(
      receiverCredExchangeResponse.encode()
    );

    // Create the VC that then will be issued by Alice to Bob, so that Bob can then prove that Alice attested to this credential about him.
    const issuerAboutReceiverVC = await issuerAgent.signedCredential({
      metadata: {
        name: 'TODO',
        type: ['TODO'],
      },
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
    issuingAgent: AlkemioAgent,
    issuingResourceID: string,
    receivingAgent: AlkemioAgent,
    receivingResourceID: string
  ): Promise<boolean> {
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
}
