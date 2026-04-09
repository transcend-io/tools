import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { ListRegimesSchema } from '../schemas.js';

export function createConsentListRegimesTool(_clients: ToolClients): ToolDefinition {
  return {
    name: 'consent_list_regimes',
    description: 'List all supported privacy regimes (GDPR, CCPA, etc.) and their configurations',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default: 50)',
        },
        cursor: {
          type: 'string',
          description: 'Pagination cursor from previous response (where supported)',
        },
      },
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListRegimesSchema, args);
      if (!parsed.success) return parsed.error;
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
  };
}
