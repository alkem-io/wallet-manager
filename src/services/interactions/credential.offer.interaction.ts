export interface BeginCredentialOfferInteractionInput {
  // The share request is going to be build using the agent of the issuer
  issuerDId: string;
  issuerPassword: string;
  // The request needs to contain the credential types
  offeredCredentials: {
    type: string;
    claim: any;
  }[];
  // The callback URL that should receive the nonce + the offerer jwt
  uniqueCallbackURL: string;
}

export interface BeginCredentialOfferInteractionOutput {
  interactionId: string;
  jwt: string;
  expiresOn: number;
}

export interface CompleteCredentialOfferInteractionInput {
  interactionId: string;
  // the token containing the credentials
  jwt: string;
}

export interface CompleteCredentialOfferInteractionOutput {
  interactionId: string;
  // the token containing the credentials
  token: string;
}
