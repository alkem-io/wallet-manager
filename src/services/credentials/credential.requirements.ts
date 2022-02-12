import { IConstraint } from 'jolocom-lib/js/interactionTokens/types';

export interface CredentialRequirements {
  type: string[];
  constraints: IConstraint[];
}
