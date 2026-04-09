import type { TranscendGraphQLBase } from '../clients/graphql/base.js';
import type { TranscendRestClient } from '../clients/rest-client.js';

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
  items?: { type: string; properties?: Record<string, ToolParameter>; required?: string[] };
  properties?: Record<string, ToolParameter>;
}

export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  readOnly: boolean;
  confirmationHint?: string;
  annotations: ToolAnnotations;
  inputSchema: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolClients {
  rest: TranscendRestClient;
  graphql: TranscendGraphQLBase;
}
