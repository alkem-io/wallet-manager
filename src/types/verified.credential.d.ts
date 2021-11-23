export type VerifiedCredential = {
  type: string;
  issuer: string;
  issued?: Date;
  claim: string;
};
