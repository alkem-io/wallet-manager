import { CredentialOffer, CredentialRenderTypes } from '@jolocom/protocol-ts';
import { CredentialMetadata } from '@src/core/contracts/credential.provider.interface';

export const generateCredentialOffer = (
  credential: CredentialMetadata,
  issuer: string
): CredentialOffer => {
  return {
    type: credential.uniqueType,
    issuer: {
      id: issuer,
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
