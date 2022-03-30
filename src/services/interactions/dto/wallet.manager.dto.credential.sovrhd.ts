import { WalletManagerSovrhdCredentialProof } from './wallet.manager.dto.credential.sovrhd.proof';

export class WalletManagerSovrhdCredential {
  issuanceDate!: Date; // "2022-03-25T09:55:33.372Z",
  issuer!: string; //"did:dock:5FCM27WW6LjZa82FqLr2R4mJh5E71yE35BWsDj2GSLTax4th",
  proof!: WalletManagerSovrhdCredentialProof;
  // {
  //   "proofPurpose": "assertionMethod",
  //   "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..z5-eSdgoXZZIgNUpqptCJipca_sPFaGbSO3CnEKLdKwWjmHXAhBy_K8BW2hMfZYNWKlvpr6qFzeVjMy-6AdDDg",
  //   "verificationMethod": "did:dock:5FCM27WW6LjZa82FqLr2R4mJh5E71yE35BWsDj2GSLTax4th#keys-1",
  //   "created": "2022-03-25T09:55:33Z",
  //   "type": "Ed25519Signature2018"
  // },
  credentialStatus!: any;
  // {
  //   "type": "CredentialStatusList2017",
  //   "id": "rev-reg:dock:0x5f41202c495a5f77c495aa581fd556ee0a919c775a3bb35e3f12395782483f16"
  // },
  context!: any;
  // [
  //   "https://www.w3.org/2018/credentials/v1",
  //   "https://service.ledgr.nl/credentials/schema/hoplrCode"
  // ],
  expirationDate!: Date; //"2023-03-25T09:55:32.282Z",
  type!: string[]; //["VerifiableCredential", "hoplrCodeCredential"],
  id!: string; //"did:dock:5CDGCUpEycrkMsmvfkaYVy4FwmHnqfeniGzZtwU9RoaXnXrp",
  credentialSchema!: any;
  // {
  //   "type": "JsonSchemaValidator2018",
  //   "id": "blob:dock:5CgrXvgVaUAgzmqW2uUhuonewKmAY8VgVDfyQzziUV2ntGWz"
  // },
  credentialSubject!: any;
  // {
  //   "id": "did:dock:5HPC8V9ef5BZu1Jbij4YjnMcFV9No68SFKhgkAnpoaf5i3rS",
  //   "hoplrCode": "PCFPP"
  // }
}
