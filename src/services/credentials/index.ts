import LocationCredentialMetadata from './location.credential.metadata';
import { RecognizedCredentials } from './recongized.credentials';
import StateModificationCredentialMetadata from './state.modification.credential.metadata';

const CredentialMetadata: Record<
  string,
  typeof StateModificationCredentialMetadata | typeof LocationCredentialMetadata
> = {
  [RecognizedCredentials.StateModificationCredential]:
    StateModificationCredentialMetadata,
  [RecognizedCredentials.LocationCredential]: LocationCredentialMetadata,
};

export default CredentialMetadata;
