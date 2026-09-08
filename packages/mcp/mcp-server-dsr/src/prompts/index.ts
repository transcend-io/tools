import type { PromptDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { dsrSubmitRequestPrompt } from './dsr_submit_request.js';

/**
 * Returns DSR workflow prompt templates for MCP prompts/list and prompts/get.
 *
 * @param _clients - Unused; accepted so createMCPServer can pass the same factory shape as getTools
 */
export function getDsrPrompts(_clients?: ToolClients): PromptDefinition[] {
  return [dsrSubmitRequestPrompt];
}
