import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const SOMBRA_VERSION: DocumentNode = parse(gql`
  query TranscendSombraVersion {
    organization {
      sombra {
        version
      }
    }
  }
`);
