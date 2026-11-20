import {
  createGraphqlRequestClient,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { PrivacyCenterInput, syncPrivacyCenter } from '@transcend-io/sdk';
import { decodeCodec } from '@transcend-io/type-utils';

import { createCollectedLogger } from '../helpers/collectingLogger.js';
import { runSync } from '../helpers/syncWrite.js';

export const WritePrivacyCenterSchema = z.object({
  privacyCenter: z
    .record(z.string(), z.unknown())
    .describe(
      'Privacy center settings to change. Only the fields given are updated. Examples: ' +
        'isDisabled, showPolicies, locales, defaultLocale, supportEmail, theme, footerLinks. ' +
        'Same shape as the privacy-center section of transcend.yml; see config_get_schema.',
    ),
  publish: z
    .boolean()
    .optional()
    .describe('Publish the privacy center after the update. Defaults to false.'),
});
export type WritePrivacyCenterInput = z.infer<typeof WritePrivacyCenterSchema>;

export function createAdminWritePrivacyCenterTool(clients: ToolClients) {
  return defineTool({
    name: 'admin_write_privacy_center',
    description:
      'Update privacy center settings: visible pages, locales, emails, theme and footer links. ' +
      'Same as the privacy-center section of `transcend inventory push`. Only the fields given ' +
      'change. When footerLinks is given, links missing from it are deleted. Publishes only ' +
      'when publish is true. Returns success and errors.',
    category: 'Admin',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    zodSchema: WritePrivacyCenterSchema,
    handler: async ({ privacyCenter, publish = false }) => {
      let input: PrivacyCenterInput;
      try {
        input = decodeCodec(PrivacyCenterInput, privacyCenter, false);
      } catch (error) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `privacyCenter does not match the transcend.yml format: ${
            error instanceof Error ? error.message : String(error)
          }. Use config_get_schema for the full schema.`,
          false,
        );
      }
      const { logger, logs } = createCollectedLogger();
      return runSync(
        () =>
          syncPrivacyCenter(createGraphqlRequestClient(clients.graphql), input, {
            logger,
            skipPublish: !publish,
          }),
        logs,
        1,
      );
    },
  });
}
