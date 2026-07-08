import { toJsonSchema } from '@transcend-io/type-utils';

import { TranscendInput } from '../codecs.js';

/**
 * Export JSON Schema for transcend.yml (for MCP agents and RPC validation)
 *
 * @returns JSON Schema derived from the TranscendInput io-ts codec
 */
export function getTranscendConfigurationSchema(): Record<string, unknown> {
  return toJsonSchema(TranscendInput) as Record<string, unknown>;
}
