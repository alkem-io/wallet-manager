import { RecognizedCredentials } from './recongized.credentials';

export default {
  type: [
    RecognizedCredentials.Credential,
    RecognizedCredentials.ProofOfLocationCredential,
  ],
  name: 'The verified location of the holder',
  context: [
    {
      city: 'schema:string',
      country: 'schema:string',
    },
  ],
};
