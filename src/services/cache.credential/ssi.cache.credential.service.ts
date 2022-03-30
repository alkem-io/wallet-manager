import { LogContext } from '@common/enums/logging.context';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { NotSupportedException } from '@src/common/exceptions/not.supported.exception';
import { SignedCredential } from 'jolocom-lib/js/credentials/signedCredential/signedCredential';
import { ISignedCredentialAttrs } from 'jolocom-lib/js/credentials/signedCredential/types';
import { constraintFunctions } from 'jolocom-lib/js/interactionTokens/credentialRequest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CacheCredentialContract } from '../credentials/system.credentials';
import { WalletManagerSovrhdCredential } from '../interactions/dto/wallet.manager.dto.credential.sovrhd';

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
export class CacheCredentialService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  MAX_CLAIM_SIZE = 4000;

  encode(credential: SignedCredential): CacheCredentialContract {
    const jsonCredential = credential.toJSON();

    const trimmedProof: Record<string, string | undefined> = {
      creator: jsonCredential.proof.creator,
      created: jsonCredential.proof.created,
      nonce: jsonCredential.proof.nonce,
      signatureValue: jsonCredential.proof.signatureValue,
      type: jsonCredential.proof.type,
    };

    if (jsonCredential.proof.id) {
      trimmedProof.id = jsonCredential.proof.id;
    }

    Object.keys(trimmedProof).forEach(key => {
      const value = trimmedProof[key];
      delete trimmedProof[key];
      trimmedProof[`proof-${key}`] = value;
    });

    // the context can be restored from the configuration, no need to persist it
    const cacheCredential: CacheCredentialContract = {
      id: jsonCredential.id,
      issued: jsonCredential.issued,
      issuer: jsonCredential.issuer,
      expires: jsonCredential.expires,
      name: jsonCredential.name,
      ...(trimmedProof as any),
      encodedClaim: JSON.stringify(jsonCredential.claim),
      encodedType: jsonCredential.type.join(','),
    };

    if (cacheCredential.encodedClaim.length > this.MAX_CLAIM_SIZE) {
      throw new NotSupportedException(
        `Unable to store credential: the encodedClaim is longer than ${this.MAX_CLAIM_SIZE} - ${cacheCredential.encodedClaim}`,
        LogContext.SSI
      );
    }

    return cacheCredential;
  }

  encodeSovrhd(
    credential: WalletManagerSovrhdCredential,
    credentialType: string
  ): CacheCredentialContract {
    const trimmedProof: Record<string, string | undefined> = {
      creator: credential.id,
      created: credential.issuanceDate.toString(),
      nonce: credential.proof.type,
      signatureValue: credential.proof.jws,
      type: credential.proof.type,
    };

    trimmedProof.id = credential.id;

    Object.keys(trimmedProof).forEach(key => {
      const value = trimmedProof[key];
      delete trimmedProof[key];
      trimmedProof[`proof-${key}`] = value;
    });

    // the context can be restored from the configuration, no need to persist it
    const cacheCredential: CacheCredentialContract = {
      id: credential.id,
      issued: credential.issuanceDate,
      issuer: credential.issuer,
      expires: credential.expirationDate,
      name: credentialType,
      ...(trimmedProof as any),
      encodedClaim: JSON.stringify(credential.credentialSubject),
      encodedType: credential.type.join(','),
    };

    if (cacheCredential.encodedClaim.length > this.MAX_CLAIM_SIZE) {
      throw new NotSupportedException(
        `Unable to store credential: the encodedClaim is longer than ${this.MAX_CLAIM_SIZE} - ${cacheCredential.encodedClaim}`,
        LogContext.SSI
      );
    }

    return cacheCredential;
  }

  decode(encodedCredential: CacheCredentialContract): SignedCredential {
    const { encodedClaim, encodedType } = encodedCredential;

    const types = encodedType.split(',');
    const claim = JSON.parse(encodedClaim);

    const signedCredAttributes = {
      id: encodedCredential.id,
      issued: encodedCredential.issued,
      issuer: encodedCredential.issuer,
      expires: encodedCredential.expires,
      name: encodedCredential.name,
      claim: claim,
      type: types,
      proof: {
        id: encodedCredential['proof-id'],
        creator: encodedCredential['proof-creator'],
        created: encodedCredential['proof-created'],
        nonce: encodedCredential['proof-nonce'],
        signatureValue: encodedCredential['proof-signatureValue'],
        type: encodedCredential['proof-type'],
      },
    };

    return SignedCredential.fromJSON(
      signedCredAttributes as ISignedCredentialAttrs
    );
  }

  getContext(): CacheCredentialContract {
    return {
      id: 'schema:string',
      issued: 'schema:string',
      issuer: 'schema:string',
      expires: 'schema:string',
      name: 'schema:string',
      encodedClaim: 'schema:string',
      encodedType: 'schema:string',
      ['proof-id']: 'schema:string',
      ['proof-creator']: 'schema:string',
      ['proof-created']: 'schema:string',
      ['proof-nonce']: 'schema:string',
      ['proof-signatureValue']: 'schema:string',
      ['proof-type']: 'schema:string',
    };
  }
}
