import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { SubmitDSRSchema } from '../schemas.js';

export function createDsrSubmitTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_submit',
    description:
      'Submit a new Data Subject Request (DSR). Supports ACCESS, ERASURE, RECTIFICATION, and other request types. The coreIdentifier defaults to the email if not provided.',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Creates a new data subject request',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of DSR request',
          enum: [
            'ACCESS',
            'ERASURE',
            'RECTIFICATION',
            'RESTRICTION',
            'SALE_OPT_OUT',
            'SALE_OPT_IN',
            'CONTACT_OPT_OUT',
            'CONTACT_OPT_IN',
            'AUTOMATED_DECISION_MAKING_OPT_OUT',
            'AUTOMATED_DECISION_MAKING_OPT_IN',
            'USE_OF_SENSITIVE_INFORMATION_OPT_OUT',
            'USE_OF_SENSITIVE_INFORMATION_OPT_IN',
            'TRACKING_OPT_OUT',
            'TRACKING_OPT_IN',
            'CUSTOM_OPT_OUT',
            'CUSTOM_OPT_IN',
            'BUSINESS_PURPOSE',
            'PLACE_ON_LEGAL_HOLD',
            'REMOVE_FROM_LEGAL_HOLD',
          ],
        },
        email: {
          type: 'string',
          description: 'Email address of the data subject',
        },
        subjectType: {
          type: 'string',
          description:
            'Type of data subject (e.g., customer, employee, prospect). Required by the Transcend API.',
        },
        coreIdentifier: {
          type: 'string',
          description: 'Core identifier for the data subject (defaults to email if not provided)',
        },
        name: {
          type: 'string',
          description: 'Name of the data subject (optional)',
        },
        locale: {
          type: 'string',
          description: 'Locale for communications (e.g., en-US)',
        },
        isSilent: {
          type: 'boolean',
          description: 'Whether to suppress email notifications',
        },
      },
      required: ['type', 'email', 'subjectType'],
    },
    handler: async (args) => {
      const parsed = validateArgs(SubmitDSRSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await rest.submitDSR({
          type: parsed.data.type,
          email: parsed.data.email,
          subjectType: parsed.data.subjectType,
          coreIdentifier: parsed.data.coreIdentifier,
          name: parsed.data.name,
          locale: parsed.data.locale,
          isSilent: parsed.data.isSilent,
        });
        return createToolResult(true, {
          request: result,
          message: `DSR of type ${parsed.data.type} submitted successfully`,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
