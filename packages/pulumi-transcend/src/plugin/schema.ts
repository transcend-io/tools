import { TranscendPullResource } from '@transcend-io/sdk';

/** Pulumi package name. It is the first segment of every type token. */
export const PACKAGE_NAME = 'transcend';

/** Type token of the Config resource. */
export const CONFIG_TYPE_TOKEN = `${PACKAGE_NAME}:index:Config`;

/** Token of the function that reads configuration. */
export const GET_CONFIG_TOKEN = `${PACKAGE_NAME}:index:getConfig`;

/** Where the plugin binary is published for `pulumi plugin install`. */
export const PLUGIN_DOWNLOAD_URL = 'github://api.github.com/transcend-io/pulumi-transcend';

const configInputProperties = {
  yaml: {
    type: 'string',
    description:
      'transcend.yml as text. Set exactly one of `yaml` and `content`. Use `variables` for <<parameters.name>> placeholders.',
  },
  content: {
    $ref: 'pulumi.json#/Any',
    description:
      'transcend.yml as an object. Keys match the file, such as `data-silos` and `consent-manager`. Set exactly one of `yaml` and `content`.',
  },
  variables: {
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Values for <<parameters.name>> placeholders in `yaml`.',
  },
  deleteExtraAttributeValues: {
    type: 'boolean',
    description: 'Delete attribute values that the configuration leaves out. Default false.',
  },
  publishToPrivacyCenter: {
    type: 'boolean',
    description: 'Publish privacy center changes after the push. Default false.',
  },
  classifyService: {
    type: 'boolean',
    description: 'Run service classification on data silos during the push. Default false.',
  },
  pageSize: {
    type: 'integer',
    description: 'Records per API request. Default 50.',
  },
} as const;

const providerProperties = {
  apiKey: {
    type: 'string',
    secret: true,
    description: 'Transcend API key. Falls back to the TRANSCEND_API_KEY environment variable.',
    defaultInfo: { environment: ['TRANSCEND_API_KEY'] },
  },
  url: {
    type: 'string',
    description:
      'Transcend API base URL. Use https://api.us.transcend.io for US hosting. Defaults to the EU API. Falls back to TRANSCEND_API_URL.',
    defaultInfo: { environment: ['TRANSCEND_API_URL'] },
  },
} as const;

/**
 * Build the Pulumi package schema the engine and SDK generators read.
 *
 * @param version - Provider version
 * @returns Schema as a JSON string
 */
export function buildSchema(version: string): string {
  return JSON.stringify({
    name: PACKAGE_NAME,
    displayName: 'Transcend',
    version,
    description: 'Manage a Transcend organization from transcend.yml with Pulumi.',
    keywords: ['transcend', 'privacy', 'consent', 'category/utility'],
    homepage: 'https://transcend.io',
    license: 'Apache-2.0',
    repository: 'https://github.com/transcend-io/pulumi-transcend',
    publisher: 'Transcend',
    pluginDownloadURL: PLUGIN_DOWNLOAD_URL,
    config: { variables: providerProperties },
    provider: {
      description: 'Credentials for the Transcend API.',
      inputProperties: providerProperties,
    },
    resources: {
      [CONFIG_TYPE_TOKEN]: {
        description:
          'A slice of an organization configuration, kept in sync with a transcend.yml document. Pulumi never deletes organization resources when this resource is removed.',
        inputProperties: configInputProperties,
        properties: {
          ...configInputProperties,
          sections: {
            type: 'array',
            items: { type: 'string' },
            description: 'Sections of the configuration this resource pushed.',
          },
          warnings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Non-fatal warnings from the last push.',
          },
        },
        required: ['sections', 'warnings'],
      },
    },
    functions: {
      [GET_CONFIG_TOKEN]: {
        description: 'Read sections of the organization configuration as transcend.yml.',
        inputs: {
          properties: {
            resources: {
              type: 'array',
              items: { type: 'string', enum: Object.values(TranscendPullResource) },
              description: 'Sections to read, such as `dataSilos`.',
            },
          },
          required: ['resources'],
        },
        outputs: {
          properties: {
            yaml: { type: 'string', description: 'The sections as transcend.yml text.' },
          },
          required: ['yaml'],
        },
      },
    },
    language: {
      nodejs: {
        packageName: '@transcend-io/pulumi-transcend',
        respectSchemaVersion: true,
      },
    },
  });
}
