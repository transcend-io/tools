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

/** Response from {@link FETCH_ORGANIZATION} */
export interface TranscendCliFetchOrganizationResponse {
  /** Active organization for the authenticated credentials */
  organization: {
    /** Organization UUID */
    id: string;
    /** Display name */
    name: string;
  };
}

/** Fetch the active organization's id and display name. */
export const FETCH_ORGANIZATION: DocumentNode = parse(gql`
  query TranscendCliFetchOrganization {
    organization {
      id
      name
    }
  }
`);
