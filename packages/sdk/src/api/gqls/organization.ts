import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const ORGANIZATION: DocumentNode = parse(gql`
  query TranscendCliOrganization {
    organization {
      sombra {
        customerUrl
      }
    }
  }
`);
