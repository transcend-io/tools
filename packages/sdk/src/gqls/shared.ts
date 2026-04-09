/**
 * Shared GQL field selection constants and types used across
 * multiple SDK domains (consent, data-inventory, etc.).
 */

/** Owner fields shared across queries */
export const OWNER_FIELDS = `
  id
  name
  email
`;

/** Team fields shared across queries */
export const TEAM_FIELDS = `
  id
  name
`;

/** Attribute value fields (with nested key) shared across queries */
export const ATTRIBUTE_VALUE_FIELDS = `
  id
  name
  attributeKey {
    id
    name
  }
`;

/** Owner assigned to an entity */
export interface TranscendOwnerGql {
  /** Owner ID */
  id: string;
  /** Owner display name */
  name: string;
  /** Owner email */
  email: string;
}

/** Team assigned to an entity */
export interface TranscendTeamGql {
  /** Team ID */
  id: string;
  /** Team name */
  name: string;
}

/** Attribute value on an entity */
export interface TranscendAttributeValueGql {
  /** Attribute value ID */
  id: string;
  /** Attribute value name */
  name: string;
  /** Attribute key */
  attributeKey: {
    /** Attribute key ID */
    id: string;
    /** Attribute key name */
    name: string;
  };
}
