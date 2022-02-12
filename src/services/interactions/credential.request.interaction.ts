export interface CredentialShareRequestDTO {
  // The share request is going to be build using the agent of the issuer
  issuerDId: string;
  issuerPassword: string;
  // The request needs to contain the credential types
  types: string[];
  // The callback URL that should receive the nonce + the offerer jwt
  uniqueCallbackURL: string;
}

export interface CredentialShareResponseDTO {
  interactionId: string;
  jwt: string;
  expiresOn: number;
}

export interface StoreSharedCredentialsDTO {
  // The offerer of the credentials
  offererDId: string;
  offererPassword: string;

  interactionId: string;
  // the token containing the credentials
  jwt: string;
}
