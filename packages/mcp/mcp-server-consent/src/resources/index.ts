import type { ResourceDefinition, ToolClients } from '@transcend-io/mcp-server-core';

import { classificationGuideResource } from './classification_guide.js';

/**
 * Returns all consent resource definitions.
 * The clients arg is accepted for API consistency with getTools,
 * but resources don't currently need API access.
 */
export function getConsentResources(_clients: ToolClients): ResourceDefinition[] {
  return [classificationGuideResource];
}
