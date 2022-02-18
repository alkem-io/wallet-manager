export type VerifiedCredential = {
  type: string;
  issuer: string;
  issued?: Date;
  claim: string;
  name: string;
  context?: string;
};
