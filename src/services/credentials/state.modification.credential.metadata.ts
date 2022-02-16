import { RecognizedCredentials } from './recongized.credentials';

export default {
  type: [
    RecognizedCredentials.Credential,
    RecognizedCredentials.StateModificationCredential,
  ],
  name: 'Authorise changing state of an entity',
  context: [
    {
      challengeID: 'schema:uuid',
      userID: 'schema:uuid',
    },
  ],
};
