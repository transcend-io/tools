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
  /** Display name for the variant */
  name: string;
  /** Description of the variant */
  description?: string;
  /** JSON-serialized variant configuration */
  configuration?: string;
  /** Locales this variant applies to */
  locales?: string[];
  /** Status of the variant */
  status?: UiVariantStatus;
  /** User flow for the variant */
  userFlow?: string;
  /** ID of the consent UI theme associated with this variant */
  themeId?: string;
}

/** Consent UI theme input from transcend.yml */
export interface ConsentThemeInput {
  /** Display name for the theme */
  name: string;
  /** ID of the theme */
  id?: string;
  /** JSON-serialized theme configuration */
  configuration?: string;
}

/**
 * Find an existing theme by id or name from transcend.yml
 *
 * @param theme - Theme input
 * @param themesById - Themes keyed by id
 * @param themesByName - Themes keyed by name
 * @returns Matching theme, if any
 */
function findExistingConsentUiTheme(
  theme: ConsentThemeInput,
  themesById: Record<string, ConsentUiTheme>,
  themesByName: Record<string, ConsentUiTheme>,
): ConsentUiTheme | undefined {
  if (theme.id) {
    return themesById[theme.id] ?? themesByName[theme.name];
  }

  return themesByName[theme.name];
}

/**
 * Format a display name into a URL-safe slug
 *
 * @param name - Display name
 * @returns Slug
 */
export function formatConsentUiSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse a JSON configuration string from transcend.yml
 *
 * @param configuration - JSON configuration string
 * @param resourceLabel - Label for error messages
 * @returns Parsed configuration object
 */
export function parseConsentUiConfiguration(
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

/**
 * Sync consent UI themes from transcend.yml
 *
 * @param client - GraphQL client
 * @param airgapBundleId - Airgap bundle ID
 * @param themes - Theme inputs
 * @param options - Options
 */
export async function syncConsentUiThemes(
  client: GraphQLClient,
  airgapBundleId: string,
  themes: ConsentThemeInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;
  const existingThemes = await fetchConsentThemes(client, { logger });
  const themesById = keyBy(existingThemes, 'id');
  const themesByName = keyBy(existingThemes, 'name');

  await map(
    themes,
    async (theme, index) => {
      const resourceLabel = `consentManager.consentThemes[${index}]`;
      const configuration = parseConsentUiConfiguration(theme.configuration, resourceLabel);
      const existingTheme = findExistingConsentUiTheme(theme, themesById, themesByName);

      if (existingTheme) {
        await makeGraphQLRequest(client, UPDATE_CONSENT_UI_THEME, {
          variables: {
            input: {
              id: existingTheme.id,
              airgapBundleId,
              name: theme.name,
              configuration,
            },
          },
          logger,
        });
        logger.info(`Successfully synced consent UI theme "${theme.name}"!`);
        return;
      }

      await makeGraphQLRequest<{
        createConsentUiTheme: {
          consentUiTheme: Pick<ConsentUiTheme, 'id' | 'name'>;
        };
      }>(client, CREATE_CONSENT_UI_THEME, {
        variables: {
          input: {
            airgapBundleId,
            name: theme.name,
            slug: formatConsentUiSlugFromName(theme.name),
            configuration,
          },
        },
        logger,
      });
      logger.info(`Successfully created consent UI theme "${theme.name}"!`);
    },
    { concurrency: 5 },
  );
}

/**
 * Sync consent UI variants from transcend.yml
 *
 * @param client - GraphQL client
 * @param airgapBundleId - Airgap bundle ID
 * @param variants - Variant inputs
 * @param options - Options
 */
export async function syncConsentUiVariants(
  client: GraphQLClient,
  airgapBundleId: string,
  variants: ConsentVariantInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;
  const existingVariants = await fetchConsentVariants(client, { logger });
  const variantLookup = keyBy(existingVariants, 'name');

  await map(
    variants,
    async (variant, index) => {
      const resourceLabel = `consentManager.consentVariants[${index}]`;
      const configuration = parseConsentUiConfiguration(variant.configuration, resourceLabel);

      if (!variant.locales?.length) {
        throw new Error(`Missing locales for ${resourceLabel}`);
      }

      const existingVariant = variantLookup[variant.name];
      if (existingVariant) {
        await makeGraphQLRequest(client, UPDATE_CONSENT_UI_VARIANT, {
          variables: {
            input: {
              id: existingVariant.id,
              airgapBundleId,
              name: variant.name,
              description: variant.description,
              locales: variant.locales,
              configuration,
              status: variant.status,
              ...(variant.themeId ? { themeId: variant.themeId } : {}),
            },
          },
          logger,
        });
        logger.info(`Successfully synced consent UI variant "${variant.name}"!`);
        return;
      }

      if (!variant.status) {
        throw new Error(`Missing status for ${resourceLabel}`);
      }

      await makeGraphQLRequest<{
        createConsentUiVariant: {
          consentUiVariant: Pick<ConsentUiVariant, 'id'>;
        };
      }>(client, CREATE_CONSENT_UI_VARIANT, {
        variables: {
          input: {
            airgapBundleId,
            name: variant.name,
            slug: formatConsentUiSlugFromName(variant.name),
            description: variant.description,
            locales: variant.locales,
            configuration,
            status: variant.status,
            ...(variant.themeId ? { themeId: variant.themeId } : {}),
          },
        },
        logger,
      });
      logger.info(`Successfully created consent UI variant "${variant.name}"!`);
    },
    { concurrency: 5 },
  );
}
