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
  /** ID of the consent UI theme associated with this variant */
  themeId?: string;
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
  const themeLookup = keyBy(existingThemes, 'name');

  await map(
    themes,
    async (theme, index) => {
      const resourceLabel = `consentManager.consentThemes[${index}]`;
      const configuration = parseConsentUiConfiguration(theme.configuration, resourceLabel);
      const existingTheme = themeLookup[theme.name];

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
      } else {
        await makeGraphQLRequest<{
          createConsentUiTheme: {
            consentUiTheme: Pick<ConsentUiTheme, 'id' | 'name'>;
          };
        }>(client, CREATE_CONSENT_UI_THEME, {
          variables: {
            input: {
              airgapBundleId,
              name: theme.name,
              slug: theme.slug,
              configuration,
            },
          },
          logger,
        });
        logger.info(`Successfully created consent UI theme "${theme.name}"!`);
      }
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
    /** Theme inputs from transcend.yml, used to resolve themeId by slug */
    themes?: ConsentThemeInput[];
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER, themes = [] } = options;
  const existingVariants = await fetchConsentVariants(client, { logger });
  const variantLookup = keyBy(existingVariants, 'name');
  const existingThemes = await fetchConsentThemes(client, { logger });
  const themeLookupBySlug = keyBy(existingThemes, 'slug');
  const themeInputById = keyBy(
    themes.filter((theme): theme is ConsentThemeInput & { id: string } => !!theme.id),
    'id',
  );

  const resolveThemeId = (themeId: string | undefined): string | undefined => {
    if (!themeId) {
      return undefined;
    }

    const themeInput = themeInputById[themeId];
    const existingTheme = themeInput ? themeLookupBySlug[themeInput.slug] : undefined;

    return existingTheme?.id ?? themeId;
  };

  await map(
    variants,
    async (variant, index) => {
      const resourceLabel = `consentManager.consentVariants[${index}]`;
      const configuration = parseConsentUiConfiguration(variant.configuration, resourceLabel);
      const themeId = resolveThemeId(variant.themeId);
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
              ...(themeId ? { themeId } : {}),
            },
          },
          logger,
        });
        logger.info(`Successfully synced consent UI variant "${variant.name}"!`);
      } else {
        await makeGraphQLRequest<{
          createConsentUiVariant: {
            consentUiVariant: Pick<ConsentUiVariant, 'id'>;
          };
        }>(client, CREATE_CONSENT_UI_VARIANT, {
          variables: {
            input: {
              airgapBundleId,
              name: variant.name,
              slug: variant.slug,
              description: variant.description,
              locales: variant.locales,
              configuration,
              status: variant.status,
              ...(themeId ? { themeId } : {}),
            },
          },
          logger,
        });
        logger.info(`Successfully created consent UI variant "${variant.name}"!`);
      }
    },
    { concurrency: 5 },
  );
}
