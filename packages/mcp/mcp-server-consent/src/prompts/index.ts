import type { PromptDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { consentInspectSitePrompt } from './consent_inspect_site.js';
import { consentResearchTrackerPrompt } from './consent_research_tracker.js';
import { consentTriagePrompt } from './consent_triage.js';

/**
 * Returns consent workflow prompt templates for MCP prompts/list and prompts/get.
 *
 * @param _clients - Unused; accepted so createMCPServer can pass the same factory shape as getTools
 */
export function getConsentPrompts(_clients?: ToolClients): PromptDefinition[] {
  return [consentTriagePrompt, consentResearchTrackerPrompt, consentInspectSitePrompt];
}
