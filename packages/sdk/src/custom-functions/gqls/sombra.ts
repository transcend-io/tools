import { gql } from 'graphql-request';

export const ORGANIZATION_SOMBRAS = gql`
  query TranscendCliOrganizationSombras {
    organization {
      sombra {
        id
        customerUrl
      }
      sombras {
        id
        customerUrl
      }
    }
  }
`;
