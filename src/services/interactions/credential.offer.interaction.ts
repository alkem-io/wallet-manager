export interface CredentialOfferDTO {
  // The share request is going to be build using the agent of the issuer
  issuerDId: string;
  issuerPassword: string;
  //
  receiverDId: string;
  receiverPassword: string;
  // The request needs to contain the credential types
  type: string;
  name: string;
  context: any;
}
