import { ISignedCredentialAttrs } from '@jolocom/protocol-ts';
import { SignedCredential } from 'jolocom-lib/js/credentials/signedCredential/signedCredential';

export enum SystemCredentials {
  CacheCredential = 'CacheCredential',
}

type CacheCredentialContract = {
  id: string;
  issued: string;
  issuer: string;
  expires?: string;
  name?: string;
  encodedClaim: string;
  encodedType: string;
  ['proof-id']?: string;
  ['proof-creator']: string;
  ['proof-created']: string;
  ['proof-nonce']: string;
  ['proof-signatureValue']: string;
  ['proof-type']: string;
};

export class CacheCredential {
  static encode(credential: SignedCredential): CacheCredentialContract {
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

    if (cacheCredential.encodedClaim.length > 255) {
      console.warn('the encodedClaim is longer than 255');
      cacheCredential.encodedClaim = '';
    }

    return cacheCredential;
  }

  static context: CacheCredentialContract = {
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

  static decode(encodedCredential: CacheCredentialContract): SignedCredential {
    const { encodedClaim, encodedType } = encodedCredential;

    const signedCredAttributes = {
      id: encodedCredential.id,
      issued: encodedCredential.issued,
      issuer: encodedCredential.issuer,
      expires: encodedCredential.expires,
      name: encodedCredential.name,
      claim: JSON.parse(encodedClaim),
      type: encodedType.split(','),
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
}
