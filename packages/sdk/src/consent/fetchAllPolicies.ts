import type { LocaleValue } from '@transcend-io/internationalization';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchPrivacyCenterUrl } from './fetchPrivacyCenterId.js';
import { POLICIES } from './gqls/policy.js';

export interface Policy {
  /** ID of policy */
  id: string;
  /** Title of policy */
  title: {
    /** Default message */
    defaultMessage: string;
  };
  /** Disabled locales */
  disabledLocales: LocaleValue[];
  /** Versions */
  versions: {
    /** Message content */
    content: {
      /** Default message */
      defaultMessage: string;
    };
  }[];
}

/**
 * Fetch all policies in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All policies in the organization
 */
export async function fetchAllPolicies(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Policy[]> {
  const { logger } = options;
  const deployedPrivacyCenterUrl = await fetchPrivacyCenterUrl(client, { logger });
  const { privacyCenterPolicies } = await makeGraphQLRequest<{
    /** Policies */
    privacyCenterPolicies: Policy[];
  }>(client, POLICIES, {
    variables: { url: deployedPrivacyCenterUrl },
    logger,
  });

  return privacyCenterPolicies.sort((a, b) =>
    a.title.defaultMessage.localeCompare(b.title.defaultMessage),
  );
}
