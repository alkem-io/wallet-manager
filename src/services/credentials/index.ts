import LocationCredentialMetadata from './location.credential.metadata';
import LocationCredentialOffer from './location.credential.offer';
import { RecognizedCredentials } from './recongized.credentials';
import StateModificationCredentialMetadata from './state.modification.credential.metadata';
import ProofOfNameCredentialMetadata from './proof.name.credential.metadata';

const CredentialMetadata: Record<
  string,
  | typeof StateModificationCredentialMetadata
  | typeof LocationCredentialMetadata
  | typeof ProofOfNameCredentialMetadata
> = {
  [RecognizedCredentials.StateModificationCredential]:
    StateModificationCredentialMetadata,
  [RecognizedCredentials.ProofOfLocationCredential]: LocationCredentialMetadata,
  [RecognizedCredentials.ProofOfNameCredential]: ProofOfNameCredentialMetadata,
};

const CredentialOffer: Record<string, typeof LocationCredentialOffer> = {
  [RecognizedCredentials.ProofOfLocationCredential]: LocationCredentialOffer,
};

export { CredentialOffer, CredentialMetadata };
