import { InitialViewState, BrowserLanguage, OnConsentExpiry } from '@transcend-io/airgap.js-types';
import {
  RegionsOperator,
  IsoCountrySubdivisionCode,
  IsoCountryCode,
  BrowserTimeZone,
} from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { EXPERIENCES } from './gqls/experiences.js';

const PAGE_SIZE = 50;

export interface ConsentExperience {
  /** ID of experience */
  id: string;
  /** Name of experience */
  name: string;
  /** Experience display name */
  displayName?: string;
  /** Region that define this regional experience */
  regions: {
    /** Sub division */
    countrySubDivision?: IsoCountrySubdivisionCode;
    /** Country */
    country?: IsoCountryCode;
  }[];
  /** In vs not in operator */
  operator: RegionsOperator;
  /** Priority of experience */
  displayPriority: number;
  /** View state to prompt when auto prompting is enabled */
  viewState: InitialViewState;
  /** Consent expiry setting */
  onConsentExpiry: OnConsentExpiry;
  /** Consent expiry */
  consentExpiry: number;
  /** Purposes that can be opted out of in a particular experience */
  purposes: {
    /** Name of purpose */
    name: string;
    /** Purpose slug */
    trackingType: string;
  }[];
  /** Purposes that are opted out by default in a particular experience */
  optedOutPurposes: {
    /** Name of purpose */
    name: string;
    /** Purpose slug */
    trackingType: string;
  }[];
  /** Browser languages that define this regional experience */
  browserLanguages: BrowserLanguage[];
  /** Browser time zones that define this regional experience */
  browserTimeZones: BrowserTimeZone[];
  /** Consent UI variant assigned to this experience */
  consentUiVariant?: {
    /** Variant ID */
    id: string;
    /** Variant slug */
    slug: string;
  };
}

/**
 * Fetch consent manager experiences
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Consent manager experiences in the organization
 */
export async function fetchConsentManagerExperiences(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<ConsentExperience[]> {
  const experiences: ConsentExperience[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      experiences: { nodes },
    } = await makeGraphQLRequest<{
      /** Consent experience */
      experiences: {
        /** List */
        nodes: ConsentExperience[];
      };
    }>(client, EXPERIENCES, {
      variables: { first: PAGE_SIZE, offset },
      logger: options.logger,
    });
    experiences.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return experiences.sort((a, b) => a.name.localeCompare(b.name));
}
