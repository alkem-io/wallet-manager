import { RecognizedCredentials } from './recongized.credentials';

export default {
  type: ['VerifiableCredential', RecognizedCredentials.LocationCredential],
  name: 'The verified location of the holder',
  context: [
    {
      SimpleExample: 'https://example.com/terms/SimpleExampleCredential',
      schema: 'https://schema.org/',
      city: 'schema:string',
      country: 'schema:string',
    },
  ],
};
