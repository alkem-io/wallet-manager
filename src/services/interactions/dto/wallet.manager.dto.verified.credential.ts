export class WalletManagerVerifiedCredential {
  type!: string;
  issuer!: string;
  issued?: Date;
  expires?: Date;
  claim!: string;
  name!: string;
  context?: string;
}
