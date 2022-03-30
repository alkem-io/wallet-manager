export enum SystemCredentials {
  CacheCredential = 'CacheCredential',
}
export type CacheCredentialContract = {
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
