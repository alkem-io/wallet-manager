import { CredentialRenderTypes } from '@jolocom/protocol-ts';
import { RecognizedCredentials } from './recongized.credentials';

export default {
  type: RecognizedCredentials.ProofOfLocationCredential,
  renderInfo: {
    renderAs: CredentialRenderTypes.document,
  },
  credential: {
    schema: 'https://schema.org/EducationalOccupationalCredential',
  },
};
