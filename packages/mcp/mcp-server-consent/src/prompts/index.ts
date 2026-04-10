import type { PromptDefinition, ToolClients } from '@transcend-io/mcp-server-core';

import { consentInspectSitePrompt } from './consent_inspect_site.js';
import { consentResearchTrackerPrompt } from './consent_research_tracker.js';
import { consentTriagePrompt } from './consent_triage.js';

/**
 * Returns all consent prompt definitions.
 * The clients arg is accepted for API consistency with getTools,
 * but prompts don't currently need API access (they return static guidance).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getConsentPrompts(_clients: ToolClients): PromptDefinition[] {
  return [consentTriagePrompt, consentResearchTrackerPrompt, consentInspectSitePrompt];
}
