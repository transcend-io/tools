import {
  ConsentPrecedenceOption,
  UnknownRequestPolicy,
  TelemetryPartitionStrategy,
  SignedIabAgreementOption,
} from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { FETCH_CONSENT_MANAGER } from './gqls/consentManager.js';

export interface ConsentManager {
  /** ID of consent manager */
  id: string;
  /** Production bundle URL */
  bundleURL: string;
  /** Test bundle URL */
  testBundleURL: string;
  /** Configuration of consent manager */
  configuration: {
    /** Domain list */
    domains: string[];
    /** Consent precedence of user vs signal */
    consentPrecedence: ConsentPrecedenceOption;
    /** Unknown request policy */
    unknownRequestPolicy: UnknownRequestPolicy;
    /** Unknown cookie policy */
    unknownCookiePolicy: UnknownRequestPolicy;
    /** Sync endpoint */
    syncEndpoint: string;
    /** Telemetry partitioning */
    telemetryPartitioning: TelemetryPartitionStrategy;
    /** Signed IAB agreement */
    signedIabAgreement: SignedIabAgreementOption;
    /** Sync groups */
    syncGroups: string;
    /** Partition parameter */
    partition: string;
  };
  /** When using a custom partition, this is the partition value */
  partition?: {
    /** Partition value */
    partition: string;
  };
}

/**
 * Fetch consent manager
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Consent manager ID in organization
 */
export async function fetchConsentManager(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<ConsentManager> {
  const {
    consentManager: { consentManager },
  } = await makeGraphQLRequest<{
    /** Consent manager query */
    consentManager: {
      /** Consent manager object */
      consentManager: ConsentManager;
    };
  }>(client, FETCH_CONSENT_MANAGER, { logger: options.logger });
  return consentManager;
}
