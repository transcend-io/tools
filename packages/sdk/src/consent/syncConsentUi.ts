import { map, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchConsentThemes, type ConsentUiTheme } from './fetchConsentThemes.js';
import {
  fetchConsentVariants,
  type ConsentUiVariant,
  type UiVariantStatus,
} from './fetchConsentVariants.js';
import {
  CREATE_CONSENT_UI_THEME,
  CREATE_CONSENT_UI_VARIANT,
  UPDATE_CONSENT_UI_THEME,
  UPDATE_CONSENT_UI_VARIANT,
} from './gqls/consentManager.js';

/** Consent UI variant input from transcend.yml */
export interface ConsentVariantInput {
  /** ID of the variant */
  id?: string;
  /** Display name for the variant */
  name: string;
  /** Unique slug for the variant */
  slug: string;
  /** Description of the variant */
  description?: string;
  /** JSON-serialized variant configuration */
  configuration?: string;
  /** Locales this variant applies to */
  locales: string[];
  /** Status of the variant */
  status: UiVariantStatus;
  /** User flow for the variant */
  userFlow?: string;
  /** Slug of the consent UI theme associated with this variant */
  themeSlug?: string;
}

/** Consent UI theme input from transcend.yml */
export interface ConsentThemeInput {
  /** ID of the theme */
  id?: string;
  /** Display name for the theme */
  name: string;
  /** Unique slug for the theme */
  slug: string;
  /** JSON-serialized theme configuration */
  configuration?: string;
}

/**
 * Parse a JSON configuration string from transcend.yml
 *
 * @param configuration - JSON configuration string
 * @param resourceLabel - Label for error messages
 * @returns Parsed configuration object
 */
function parseConsentUiConfiguration(
  configuration: string | undefined,
  resourceLabel: string,
): Record<string, unknown> {
  if (!configuration) {
    throw new Error(`Missing configuration for ${resourceLabel}`);
  }

  try {
    return JSON.parse(configuration) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON configuration for ${resourceLabel}`);
  }
}

/** Consent UI theme synced to Transcend (id + slug for variant theme assignment) */
export type SyncedConsentUiTheme = Pick<ConsentUiTheme, 'id' | 'slug'>;

/** Consent UI variant synced to Transcend (id + slug for experience consentUiVariantSlug assignment) */
export type SyncedConsentUiVariant = Pick<ConsentUiVariant, 'id' | 'slug'>;

/**
 * Sync consent UI themes from transcend.yml
 *
 * @param client - GraphQL client
 * @param airgapBundleId - Airgap bundle ID
 * @param yamlThemes - Theme inputs from transcend.yml
 * @param options - Options
 * @returns Synced themes (id + slug) for resolving variant themeSlug assignments
 */
export async function syncConsentUiThemes(
  client: GraphQLClient,
  airgapBundleId: string,
  yamlThemes: ConsentThemeInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<SyncedConsentUiTheme[]> {
  const { logger = NOOP_LOGGER } = options;
  const remoteThemes = await fetchConsentThemes(client, { logger });
  const remoteThemeBySlug = keyBy(remoteThemes, 'slug');
  const syncedThemes: SyncedConsentUiTheme[] = [];

  await map(
    yamlThemes,
    async (yamlTheme, index) => {
      const resourceLabel = `consentManager.consentThemes[${index}]`;
      const configuration = parseConsentUiConfiguration(yamlTheme.configuration, resourceLabel);
      const remoteTheme = remoteThemeBySlug[yamlTheme.slug];

      if (remoteTheme) {
        await makeGraphQLRequest(client, UPDATE_CONSENT_UI_THEME, {
          variables: {
            input: {
              id: remoteTheme.id,
              airgapBundleId,
              name: yamlTheme.name,
              configuration,
            },
          },
          logger,
        });
        syncedThemes.push({ id: remoteTheme.id, slug: yamlTheme.slug });
        logger.info(`Successfully synced consent UI theme "${yamlTheme.name}"!`);
      } else {
        const result = await makeGraphQLRequest<{
          createConsentUiTheme: {
            consentUiTheme: Pick<ConsentUiTheme, 'id' | 'name'>;
          };
        }>(client, CREATE_CONSENT_UI_THEME, {
          variables: {
            input: {
              airgapBundleId,
              name: yamlTheme.name,
              slug: yamlTheme.slug,
              configuration,
            },
          },
          logger,
        });
        syncedThemes.push({
          id: result.createConsentUiTheme.consentUiTheme.id,
          slug: yamlTheme.slug,
        });
        logger.info(`Successfully created consent UI theme "${yamlTheme.name}"!`);
      }
    },
    { concurrency: 5 },
  );

  return syncedThemes;
}

/**
 * Sync consent UI variants from transcend.yml
 *
 * @param client - GraphQL client
 * @param airgapBundleId - Airgap bundle ID
 * @param yamlVariants - Variant inputs from transcend.yml
 * @param syncedThemes - Themes synced by syncConsentUiThemes, used to resolve themeSlug
 * @param options - Options
 * @returns Synced variants (id + slug) for resolving experience consentUiVariantSlug assignments
 */
export async function syncConsentUiVariants(
  client: GraphQLClient,
  airgapBundleId: string,
  yamlVariants: ConsentVariantInput[],
  syncedThemes: SyncedConsentUiTheme[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<SyncedConsentUiVariant[]> {
  const { logger = NOOP_LOGGER } = options;
  const remoteVariants = await fetchConsentVariants(client, { logger });
  const remoteVariantBySlug = keyBy(remoteVariants, 'slug');
  const syncedThemeBySlug = keyBy(syncedThemes, 'slug');
  const syncedVariants: SyncedConsentUiVariant[] = [];

  await map(
    yamlVariants,
    async (yamlVariant, index) => {
      const resourceLabel = `consentManager.consentVariants[${index}]`;
      const configuration = parseConsentUiConfiguration(yamlVariant.configuration, resourceLabel);
      const remoteThemeId = yamlVariant.themeSlug
        ? syncedThemeBySlug[yamlVariant.themeSlug]?.id
        : undefined;
      const remoteVariant = remoteVariantBySlug[yamlVariant.slug];

      if (remoteVariant) {
        await makeGraphQLRequest(client, UPDATE_CONSENT_UI_VARIANT, {
          variables: {
            input: {
              id: remoteVariant.id,
              airgapBundleId,
              name: yamlVariant.name,
              description: yamlVariant.description,
              locales: yamlVariant.locales,
              configuration,
              status: yamlVariant.status,
              ...(remoteThemeId ? { themeId: remoteThemeId } : {}),
            },
          },
          logger,
        });
        syncedVariants.push({ id: remoteVariant.id, slug: yamlVariant.slug });
        logger.info(`Successfully synced consent UI variant "${yamlVariant.name}"!`);
      } else {
        const result = await makeGraphQLRequest<{
          createConsentUiVariant: {
            consentUiVariant: Pick<ConsentUiVariant, 'id'>;
          };
        }>(client, CREATE_CONSENT_UI_VARIANT, {
          variables: {
            input: {
              airgapBundleId,
              name: yamlVariant.name,
              slug: yamlVariant.slug,
              description: yamlVariant.description,
              locales: yamlVariant.locales,
              configuration,
              status: yamlVariant.status,
              ...(remoteThemeId ? { themeId: remoteThemeId } : {}),
            },
          },
          logger,
        });
        syncedVariants.push({
          id: result.createConsentUiVariant.consentUiVariant.id,
          slug: yamlVariant.slug,
        });
        logger.info(`Successfully created consent UI variant "${yamlVariant.name}"!`);
      }
    },
    { concurrency: 5 },
  );

  return syncedVariants;
}
