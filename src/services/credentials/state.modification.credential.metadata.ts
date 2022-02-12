import { RecognizedCredentials } from './recongized.credentials';

export default {
  type: [
    'VerifiableCredential',
    RecognizedCredentials.StateModificationCredential,
  ],
  name: 'Authorise changing state of an entity',
  context: [
    {
      SimpleExample: 'https://example.com/terms/SimpleExampleCredential',
      schema: 'https://schema.org/',
      challengeID: 'schema:uuid',
      userID: 'schema:uuid',
    },
  ],
};
