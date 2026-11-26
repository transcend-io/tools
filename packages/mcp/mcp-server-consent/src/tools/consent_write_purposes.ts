import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { ConsentPurpose, type ConsentPurpose as ConsentPurposeInput } from '@transcend-io/sdk';

export const WritePurposesSchema = z.object({
  purposes: ymlItemsSchema(
    'Purposes, same shape as the purposes section of transcend.yml. Each needs trackingType, ' +
      'title and name.',
    { codec: ConsentPurpose },
  ),
});
export type WritePurposesInput = z.infer<typeof WritePurposesSchema>;

export function createConsentWritePurposesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_write_purposes',
    description:
      'Create or update consent purposes, matched by trackingType, like the purposes section of ' +
      'transcend.yml. Also syncs the preference topics nested in each purpose. Purposes missing ' +
      'from the list are not deleted. Returns success and errors.',
    category: 'Consent Management',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WritePurposesSchema,
    handler: async ({ purposes }) => {
      const decoded = decodeYmlItems<ConsentPurposeInput>(ConsentPurpose, purposes, 'purposes', {
        uniqueBy: (item) => item.trackingType,
      });
      return pushYmlSection(clients, { purposes: decoded }, decoded.length);
    },
  });
}
