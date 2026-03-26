import { makeEnum } from '@transcend-io/type-utils';

import { CommunicationIdentifierType } from './identifier.js';

/**
 * Enrichers that are a bit more freeform, as in they can take in arbitrary inputs
 * and return arbitrary outputs
 */
export const CustomEnricherType = makeEnum({
  /** Notify a server to enrich the variable */
  Server: 'SERVER',
  /** Notify a person to enrich the value */
  Person: 'PERSON',
  /** Check the legal hold list for that enricher type */
  LegalHold: 'LEGAL_HOLD',
  /** Auto approve a specific identifier in a specific situation */
  AutoApprove: 'AUTO_APPROVE',
  /** Test an identifier using a regex */
  RegexMatch: 'REGEX_MATCH',
  /** Perform conditional logic based on region */
  RegionMatcher: 'REGION_MATCH',
  /** Execute an SQL query against a database */
  Database: 'DATABASE',
  /** Execute a look in looker to map identifiers */
  Looker: 'LOOKER',
  /** Adds an enricher dependency */
  WaitPeriod: 'WAIT_PERIOD',
  /** Verify a government ID */
  GovernmentId: 'GOVERNMENT_ID',
  /** Custom Function enricher type. */
  CustomFunction: 'CUSTOM_FUNCTION',
});

/**
 * Override to cast as string
 */
export type CustomEnricherType = (typeof CustomEnricherType)[keyof typeof CustomEnricherType];

/**
 * Enrichers that can only be used to initialize the beginning of a DSR
 */
export const InitEnricherType = makeEnum({
  /** Sombra has the capability */
  Sombra: 'SOMBRA',
});

/**
 * Override to cast as string
 */
export type InitEnricherType = (typeof InitEnricherType)[keyof typeof InitEnricherType];

/**
 * The various types of identity enrichers supported by transcend
 */
export const EnricherType = makeEnum({
  ...InitEnricherType,
  ...CommunicationIdentifierType,
  ...CustomEnricherType,
});

/**
 * Override to cast as string
 */
export type EnricherType = (typeof EnricherType)[keyof typeof EnricherType];
