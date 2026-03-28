import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const IDENTIFIERS: DocumentNode = parse(gql`
  query TranscendCliIdentifiers($first: Int!, $offset: Int!) {
    identifiers(
      first: $first
      offset: $offset
      useMaster: false
      orderBy: [{ field: createdAt, direction: ASC }, { field: name, direction: ASC }]
    ) {
      nodes {
        id
        name
        type
        regex
        selectOptions
        privacyCenterVisibility
        dataSubjects {
          type
        }
        isRequiredInForm
        placeholder
        displayTitle {
          defaultMessage
        }
        displayDescription {
          defaultMessage
        }
        displayOrder
        isUniqueOnPreferenceStore
      }
    }
  }
`);
