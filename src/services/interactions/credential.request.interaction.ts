export interface BeginCredentialRequestInteractionInputDTO {
  // The share request is going to be build using the agent of the issuer
  issuerDId: string;
  issuerPassword: string;
  // The request needs to contain the credential types
  types: string[];
  // The callback URL that should receive the nonce + the offerer jwt
  uniqueCallbackURL: string;
}

export interface BeginCredentialRequestInteractionOutputDTO {
  interactionId: string;
  jwt: string;
  expiresOn: number;
}

export interface CompleteCredentialRequestInteractionInputDTO {
  interactionId: string;
  // the token containing the credentials
  jwt: string;
}
