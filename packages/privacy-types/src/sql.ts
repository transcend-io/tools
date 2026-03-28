import { LOCALE_KEY } from '@transcend-io/internationalization';
import { valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

import { RequestAction } from './actions.js';

/**
 * Allowed database variable formats
 */
export const DatabaseVariables = t.record(
  t.string,
  t.union([t.boolean, t.string, t.null, t.number, t.array(t.string)]),
);

/** Override type */
export type DatabaseVariables = t.TypeOf<typeof DatabaseVariables>;

/**
 * The supported variables when running SQL queries for a privacy request
 *
 * e.g. INSERT INTO table (id, type) VALUES (@requestId, @requestType);
 * e.g. INSERT INTO table (id, type) VALUES ('{{requestId}}', '{{requestType}}');
 */
export const DatabaseSqlVariablesForPrivacyRequest = t.intersection([
  t.type({
    /** The unique UUID for the privacy request */
    requestId: t.string,
    /** The action type of the privacy request */
    requestType: valuesOf(RequestAction),
    /** The time that the privacy request was created */
    requestCreatedAt: t.string,
    /** The language key for the privacy request */
    requestLocale: valuesOf(LOCALE_KEY),
    /** Additional details provided about the request */
    requestDetails: t.string,
    /** Whether the request is a test request */
    requestIsTest: t.boolean,
    /** Origin in which request was made */
    requestOrigin: t.union([t.string, t.null]),
    /** Slug for type of data subject that made the request */
    requestDataSubjectType: t.string,
    /** The country code of person that made the request */
    requestCountry: t.union([t.string, t.null]),
    /** The country sub division code of person that made the request */
    requestCountrySubDivision: t.union([t.string, t.null]),
    /** Primary email value on request */
    requestPrimaryEmailValue: t.union([t.string, t.null]),
    /** Slug of consent purpose that triggered the request */
    consentPurposeTriggerSlug: t.union([t.string, t.null]),
    /** True/false consent value that triggered the request */
    consentPurposeTriggerValue: t.union([t.boolean, t.null]),
    /** The unique ID of partition that request was for */
    partitionId: t.union([t.string, t.null]),
    /** The name of partition that request was for */
    partitionName: t.union([t.string, t.null]),
  }),
  /**
   * Additional dynamic variables that can be passed in for the request
   * These consists of:
   * - consentPreference_<slug> - the consent preference value associated with consentPurpose change
   * - customField_<slug> - the custom field value associated with the request
   */
  DatabaseVariables,
]);

/**
 * Type override
 */
export type DatabaseSqlVariablesForPrivacyRequest = t.TypeOf<
  typeof DatabaseSqlVariablesForPrivacyRequest
>;
