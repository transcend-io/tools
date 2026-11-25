import { ConsentBundleType } from '@transcend-io/privacy-types';

import {
  ConsentDeployModuleKey,
  type ConsentBundleDeployDiff,
  type ConsentDeployModuleKeyValue,
} from './types.js';

/** Max highlights listed per module before the rest collapse into "and N more" */
const MAX_HIGHLIGHTS_PER_MODULE = 5;

const MODULE_LABEL: Record<ConsentDeployModuleKeyValue, string> = {
  [ConsentDeployModuleKey.Core]: 'Core',
  [ConsentDeployModuleKey.Scripts]: 'Scripts',
  [ConsentDeployModuleKey.Tcf]: 'TCF',
  [ConsentDeployModuleKey.NativeApp]: 'Native app',
  [ConsentDeployModuleKey.Messages]: 'Messages',
  [ConsentDeployModuleKey.Stylesheet]: 'Stylesheet',
  [ConsentDeployModuleKey.UiV2Messages]: 'UI v2 messages',
  [ConsentDeployModuleKey.UiV2Themes]: 'UI v2 themes',
};

function envLabel(bundleType: ConsentBundleType): string {
  return bundleType === ConsentBundleType.Test ? 'TEST (/cm-test)' : 'PRODUCTION (/cm)';
}

function formatHighlights(highlights: string[]): string {
  const shown = highlights.slice(0, MAX_HIGHLIGHTS_PER_MODULE).join(', ');
  const extra = highlights.length - MAX_HIGHLIGHTS_PER_MODULE;
  return extra > 0 ? `${shown}, and ${extra} more` : shown;
}

/**
 * One line summary of pending changes, for the human deploy confirmation form.
 *
 * Example: `TEST (/cm-test) changed since Nov 24, 2026, 8:12 PM EST: Core (loadOptions); Messages (en, fr-FR).`
 * Full patches come from the read-only preview tool.
 *
 * @param diff - Module diff result
 * @param bundleType - Target environment
 * @returns Plain-text summary
 */
export function summarizeConsentBundleDeployDiff(
  diff: ConsentBundleDeployDiff,
  bundleType: ConsentBundleType,
): string {
  const env = envLabel(bundleType);

  if (diff.firstDeploy) {
    return `First deploy to ${env}. All saved configuration will be published.`;
  }

  const since = diff.lastDeployedAt
    ? `since ${new Date(diff.lastDeployedAt).toLocaleString('en-US', {
        // dateStyle and timeStyle cannot be combined with timeZoneName
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })}`
    : 'since the last deploy';

  if (!diff.hasChanges) {
    return `No pending changes for ${env} ${since}.`;
  }

  const parts = diff.modules
    .filter((mod) => mod.changesMade)
    .map((mod) => {
      const label = MODULE_LABEL[mod.key];
      return mod.highlights.length > 0 ? `${label} (${formatHighlights(mod.highlights)})` : label;
    });

  return `${env} changed ${since}: ${parts.join('; ')}.`;
}
