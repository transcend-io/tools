import { ConsentBundleType } from '@transcend-io/privacy-types';

import { ConsentDeployModuleKey } from './diffConsentBundleDeploy.js';
import type { ConsentBundleDeployDiff } from './types.js';

function envLabel(bundleType: ConsentBundleType): string {
  return bundleType === ConsentBundleType.Test ? 'TEST (/cm-test)' : 'PRODUCTION (/cm)';
}

/**
 * Short summary for deploy confirmation prompts.
 *
 * @param diff - Module diff result
 * @param bundleType - Target environment
 * @returns Plain-text lines
 */
export function summarizeConsentBundleDeployDiff(
  diff: ConsentBundleDeployDiff,
  bundleType: ConsentBundleType,
): string {
  const lines: string[] = [];

  if (diff.firstDeploy) {
    lines.push(
      `First deploy to ${envLabel(bundleType)}. All saved configuration will be published.`,
    );
    return lines.join('\n');
  }

  const since = diff.lastDeployedAt
    ? `since ${new Date(diff.lastDeployedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`
    : 'since the last deploy';

  if (!diff.hasChanges) {
    lines.push(`No pending changes for ${envLabel(bundleType)} ${since}.`);
    return lines.join('\n');
  }

  lines.push(`Pending changes for ${envLabel(bundleType)} ${since}:`);

  for (const mod of diff.modules) {
    if (!mod.changesMade) continue;
    if (mod.key === ConsentDeployModuleKey.Core && mod.highlights.length > 0) {
      lines.push(`Core: ${mod.highlights.join(', ')}`);
      continue;
    }
    if (mod.key === ConsentDeployModuleKey.Messages && mod.highlights.length > 0) {
      lines.push(`Messages: ${mod.highlights.join(', ')}`);
      continue;
    }
    if (mod.key === ConsentDeployModuleKey.UiV2Messages && mod.highlights.length > 0) {
      lines.push(`UI v2 messages: ${mod.highlights.join(', ')}`);
      continue;
    }
    if (mod.key === ConsentDeployModuleKey.UiV2Themes && mod.highlights.length > 0) {
      lines.push(`UI v2 themes: ${mod.highlights.join(', ')}`);
      continue;
    }
    lines.push(`${mod.key} changed`);
  }

  lines.push(
    'Call consent_preview_deploy and show module patches in diff code blocks before deploying.',
  );
  return lines.join('\n');
}
