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
 * @param yamlThemes - Theme inputs from transcend.yml
 * @param options - Options
 */
export async function syncConsentUiThemes(
  client: GraphQLClient,
  airgapBundleId: string,
  yamlThemes: ConsentThemeInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;
  const remoteThemes = await fetchConsentThemes(client, { logger });
  const remoteThemeById = keyBy(remoteThemes, 'id');

  await map(
    yamlThemes,
    async (yamlTheme, index) => {
      const resourceLabel = `consentManager.consentThemes[${index}]`;
      const configuration = parseConsentUiConfiguration(yamlTheme.configuration, resourceLabel);
      const remoteTheme = yamlTheme.id ? remoteThemeById[yamlTheme.id] : undefined;

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
        logger.info(`Successfully synced consent UI theme "${yamlTheme.name}"!`);
      } else {
        await makeGraphQLRequest<{
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
        logger.info(`Successfully created consent UI theme "${yamlTheme.name}"!`);
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
 * @param yamlVariants - Variant inputs from transcend.yml
 * @param options - Options
 */
export async function syncConsentUiVariants(
  client: GraphQLClient,
  airgapBundleId: string,
  yamlVariants: ConsentVariantInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Theme inputs from transcend.yml, used to resolve themeId by slug */
    yamlThemes?: ConsentThemeInput[];
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER, yamlThemes = [] } = options;
  const remoteVariants = await fetchConsentVariants(client, { logger });
  const remoteVariantById = keyBy(remoteVariants, 'id');
  const remoteThemes = await fetchConsentThemes(client, { logger });
  const remoteThemeBySlug = keyBy(remoteThemes, 'slug');
  // Variants reference themes by id in yaml (themeId), but that id is only accurate at pull time.
  // If a theme was deleted and recreated, the yaml id is stale even though the theme entry still
  // exists in consentThemes with the same slug. Index yaml themes by id so we can bridge stale
  // themeId -> slug -> the theme that syncConsentUiThemes just created/updated remotely.
  const yamlThemeById = keyBy(
    yamlThemes.filter(
      (yamlTheme): yamlTheme is ConsentThemeInput & { id: string } => !!yamlTheme.id,
    ),
    'id',
  );

  // Remap a yaml themeId to the current remote id: look up the theme in consentThemes by id,
  // then find the live theme with that slug (themes are synced before variants). themeId is
  // optional on create/update, so omit it when the yaml entry is missing or slug lookup fails
  // rather than pass an id that may no longer exist remotely.
  const resolveRemoteThemeId = (yamlThemeId: string | undefined): string | undefined => {
    if (!yamlThemeId) {
      return undefined;
    }

    const yamlTheme = yamlThemeById[yamlThemeId];
    if (!yamlTheme) {
      return undefined;
    }

    return remoteThemeBySlug[yamlTheme.slug]?.id;
  };

  await map(
    yamlVariants,
    async (yamlVariant, index) => {
      const resourceLabel = `consentManager.consentVariants[${index}]`;
      const configuration = parseConsentUiConfiguration(yamlVariant.configuration, resourceLabel);
      const remoteThemeId = resolveRemoteThemeId(yamlVariant.themeId);
      const remoteVariant = yamlVariant.id ? remoteVariantById[yamlVariant.id] : undefined;

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
        logger.info(`Successfully synced consent UI variant "${yamlVariant.name}"!`);
      } else {
        await makeGraphQLRequest<{
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
        logger.info(`Successfully created consent UI variant "${yamlVariant.name}"!`);
      }
    },
    { concurrency: 5 },
  );
}
