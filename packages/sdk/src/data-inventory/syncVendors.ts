import { IsoCountryCode, IsoCountrySubdivisionCode } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllVendors, Vendor } from './fetchAllVendors.js';
import { UPDATE_VENDORS, CREATE_VENDOR } from './gqls/vendor.js';

export interface VendorInput {
  /** Display title of the vendor */
  title: string;
  /** Description of the vendor */
  description?: string;
  /** URL to the data processing agreement */
  dataProcessingAgreementLink?: string;
  /** Name of the primary contact */
  contactName?: string;
  /** Phone number of the primary contact */
  contactPhone?: string;
  /** Physical address */
  address?: string;
  /** Headquarters country */
  headquarterCountry?: IsoCountryCode;
  /** Headquarters country subdivision */
  headquarterSubDivision?: IsoCountrySubdivisionCode;
  /** Vendor website URL */
  websiteUrl?: string;
  /** Title of the associated business entity */
  businessEntity?: string;
  /** Owner email addresses to assign */
  owners?: string[];
  /** Team names to assign */
  teams?: string[];
  /** Custom attribute values to assign */
  attributes?: {
    /** Attribute key name */
    key: string;
    /** Attribute values */
    values: string[];
  }[];
}

/**
 * Input to create a new vendor
 *
 * @param client - GraphQL client
 * @param vendor - Input
 * @returns Created vendor
 */
export async function createVendor(
  client: GraphQLClient,
  vendor: VendorInput,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<Pick<Vendor, 'id' | 'title'>> {
  const { logger = NOOP_LOGGER } = options;
  const input = {
    title: vendor.title,
    description: vendor.description,
    address: vendor.address,
    headquarterCountry: vendor.headquarterCountry,
    headquarterSubDivision: vendor.headquarterSubDivision,
    dataProcessingAgreementLink: vendor.dataProcessingAgreementLink,
    contactName: vendor.contactName,
    contactPhone: vendor.contactPhone,
    websiteUrl: vendor.websiteUrl,
    // TODO: https://transcend.height.app/T-31994 - add attributes, teams, owners
  };

  const { createVendor } = await makeGraphQLRequest<{
    /** Create vendor mutation */
    createVendor: {
      /** Created vendor */
      vendor: Vendor;
    };
  }>(client, CREATE_VENDOR, {
    variables: { input },
    logger,
  });
  return createVendor.vendor;
}

/**
 * Input to update vendors
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function updateVendors(
  client: GraphQLClient,
  options: {
    /** [VendorInput, vendorId] list */
    vendors: [VendorInput, string][];
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { vendors, logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, UPDATE_VENDORS, {
    variables: {
      input: {
        vendors: vendors.map(([vendor, id]) => ({
          id,
          title: vendor.title,
          description: vendor.description,
          address: vendor.address,
          headquarterCountry: vendor.headquarterCountry,
          headquarterSubDivision: vendor.headquarterSubDivision,
          dataProcessingAgreementLink: vendor.dataProcessingAgreementLink,
          contactName: vendor.contactName,
          contactPhone: vendor.contactPhone,
          websiteUrl: vendor.websiteUrl,
          // TODO: https://transcend.height.app/T-31994 - add teams, owners
          attributes: vendor.attributes,
        })),
      },
    },
    logger,
  });
}

/**
 * Sync the data inventory vendors
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncVendors(
  client: GraphQLClient,
  inputs: VendorInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  // Fetch existing
  logger.info(`Syncing "${inputs.length}" vendors...`);

  let encounteredError = false;

  // Fetch existing
  const existingVendors = await fetchAllVendors(client, { logger });

  // Look up by title
  const vendorByTitle: { [k in string]: Pick<Vendor, 'id' | 'title'> } = keyBy(
    existingVendors,
    'title',
  );

  // Create new vendors
  const newVendors = inputs.filter((input) => !vendorByTitle[input.title]);

  // Create new vendors
  await mapSeries(newVendors, async (vendor) => {
    try {
      const newVendor = await createVendor(client, vendor, { logger });
      vendorByTitle[newVendor.title] = newVendor;
      logger.info(`Successfully synced vendor "${vendor.title}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to sync vendor "${vendor.title}"! - ${(err as Error).message}`);
    }
  });

  // Update all vendors
  try {
    logger.info(`Updating "${inputs.length}" vendors!`);
    await updateVendors(client, {
      vendors: inputs.map((input) => [input, vendorByTitle[input.title]!.id]),
      logger,
    });
    logger.info(`Successfully synced "${inputs.length}" vendors!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to sync "${inputs.length}" vendors ! - ${(err as Error).message}`);
  }

  return !encounteredError;
}
