import { WalletManagerCredentialOfferMetadata } from './wallet.manager.dto.credential.offer.metadata';

export class WalletManagerOfferVcBegin {
  issuerDID!: string;
  issuerPassword!: string;
  offeredCredentials!: WalletManagerCredentialOfferMetadata[];
  uniqueCallbackURL!: string;
}
