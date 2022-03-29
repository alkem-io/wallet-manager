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
import { WalletManagerVerifiedCredential } from '@src/services/interactions/dto/wallet.manager.dto.verified.credential';
import { constraintFunctions } from 'jolocom-lib/js/interactionTokens/credentialRequest';
import { CredentialOfferRequestAttrs } from 'jolocom-lib/js/interactionTokens/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Connection } from 'typeorm';
import { CacheCredential, SystemCredentials } from '../credentials';
import { WalletManagerCredentialMetadata } from '../interactions/dto/wallet.manager.dto.credential.metadata';

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
    credentialMetadata: WalletManagerCredentialMetadata[]
  ): Promise<WalletManagerVerifiedCredential[]> {
    const credentialsResult: WalletManagerVerifiedCredential[] = [];
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

      let verifiedCredential: WalletManagerVerifiedCredential = {
        claim: JSON.stringify(claim),
        issuer: credential.issuer,
        type: credential.type[credential.type.length - 1],
        issued: credential.issued,
        expires: credential.expires || 0,
        context: JSON.stringify(context),
        name: name,
      };

      try {
        // TODO isolate logic in wrap/unwrap methods for CachedCredentials
        if (credential.type.indexOf(SystemCredentials.CacheCredential) !== -1) {
          const signedCredential = CacheCredential.decode(
            credential.claim as any
          );

          if (signedCredential.issuer) {
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
    this.logger.verbose?.(
      `Returning credentials: '${JSON.stringify(credentialsResult)}'`,
      LogContext.SSI
    );
    return credentialsResult;
  }
}
