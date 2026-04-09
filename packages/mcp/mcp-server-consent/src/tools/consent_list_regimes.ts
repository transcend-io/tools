import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

const PaginationSchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Results per page (1-100, default: 50)'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor from previous response (where supported)'),
});

export const ListRegimesSchema = PaginationSchema;
export type ListRegimesInput = z.infer<typeof ListRegimesSchema>;

export function createConsentListRegimesTool(_clients: ToolClients) {
  return defineTool({
    name: 'consent_list_regimes',
    description: 'List all supported privacy regimes (GDPR, CCPA, etc.) and their configurations',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListRegimesSchema,
    handler: async (_args) => {
      return createToolResult(true, {
        regimes: [
          { code: 'GDPR', name: 'General Data Protection Regulation', region: 'EU' },
          { code: 'CCPA', name: 'California Consumer Privacy Act', region: 'US-CA' },
          { code: 'CPRA', name: 'California Privacy Rights Act', region: 'US-CA' },
          { code: 'VCDPA', name: 'Virginia Consumer Data Protection Act', region: 'US-VA' },
          { code: 'CPA', name: 'Colorado Privacy Act', region: 'US-CO' },
          { code: 'CTDPA', name: 'Connecticut Data Privacy Act', region: 'US-CT' },
          { code: 'LGPD', name: 'Lei Geral de Proteção de Dados', region: 'BR' },
          {
            code: 'PIPEDA',
            name: 'Personal Information Protection and Electronic Documents Act',
            region: 'CA',
          },
        ],
        note: 'Contact your administrator for organization-specific regime configurations',
      });
    },
  });
}
