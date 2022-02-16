import { RecognizedCredentials } from './recongized.credentials';

export default {
  type: [
    RecognizedCredentials.Credential,
    RecognizedCredentials.ProofOfNameCredential,
  ],
  name: 'Proof of the credential holders name',
  context: [
    {
      name: 'schema:name',
    },
  ],
};
