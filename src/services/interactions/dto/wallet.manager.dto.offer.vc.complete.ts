import { WalletManagerCredentialMetadata } from './wallet.manager.dto.credential.metadata';

export class WalletManagerOfferVcComplete {
  issuerDID!: string;
  issuerPassword!: string;
  credentialMetadata!: WalletManagerCredentialMetadata[];
  interactionId!: string;
  jwt!: string;
}
