import { CredentialOffer, CredentialRenderTypes } from '@jolocom/protocol-ts';
import { CredentialMetadataInput } from './credential.dto.metadata';

// this might also belong to the trust registry - should be discussed
export const generateCredentialOffer = (
  credential: CredentialMetadataInput,
  issuer: string
): CredentialOffer => {
  return {
    type: credential.uniqueType,
    issuer: {
      id: issuer,
      name: 'alkemio',
    },
    renderInfo: {
      background: { color: '#068293' }, // use Alkemio branding
      renderAs: CredentialRenderTypes.document,
      text: { color: '#fff' }, // use Alkemio branding
      logo: {
        url: 'https://alkem.io/media/logo_hud979ab485f15f8277c854686ea4bbd80_16848_0x70_resize_lanczos_3.png',
      },
    },
    credential: {
      schema: credential.schema,
      name: credential.name,
    },
  };
};
