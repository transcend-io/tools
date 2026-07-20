import { gql } from 'graphql-request';

export const ORGANIZATION_SOMBRAS = gql`
  query TranscendCliOrganizationSombras {
    organization {
      sombra {
        id
        publicKeyECDH
      }
      sombras {
        id
        publicKeyECDH
      }
    }
  }
`;

export const CREATE_SOMBRA_API_KEY_SESSION = gql`
  mutation TranscendCliCreateSombraApiKeySession($publicKey: String!, $sombraId: ID) {
    createSombraApiKeySession(publicKey: $publicKey, sombraId: $sombraId) {
      decryptionContext {
        wrappedKey
        authTag
        iv
      }
    }
  }
`;
