import { WalletManagerCredentialMetadata } from './wallet.manager.dto.credential.metadata';

export class WalletManagerRequestVcBegin {
  issuerDID!: string;
  issuerPassword!: string;
  credentialMetadata!: WalletManagerCredentialMetadata[];
  uniqueCallbackURL!: string;
}
