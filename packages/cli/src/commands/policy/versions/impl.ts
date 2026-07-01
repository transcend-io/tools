import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';
import {
  buildPolicyEngineClient,
  printResult,
  renderTable,
  resolveBundleIdByName,
} from '../helpers/index.js';
import type { PolicyBundleVersionListResponse } from '../types.js';

/** Placeholder for nullable API fields in table output. */
const EMPTY_CELL = '-';

/** CLI flags for `transcend policy versions`. */
export interface VersionsCommandFlags {
  /** Tenant-unique bundle name */
  bundleName: string;
  /** Transcend API key */
  auth: string;
  /** Transcend API URL */
  transcendUrl: string;
  /** Page size */
  limit: number;
  /** Cursor from a previous page's pageInfo.endCursor */
  after?: string;
  /** Print raw JSON response */
  json: boolean;
}

/**
 * List versions for a policy bundle.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function versions(
  this: LocalContext,
  { bundleName, auth, transcendUrl, limit, after, json }: VersionsCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const client = buildPolicyEngineClient(transcendUrl, auth);
  const bundleId = await resolveBundleIdByName(client, bundleName);

  if (!bundleId) {
    throw new Error(`Policy bundle "${bundleName}" was not found for this organization.`);
  }

  logger.info(colors.green(`Listing versions for bundle "${bundleName}"...`));

  const searchParams: Record<string, string | number> = { limit };
  if (after) {
    searchParams.after = after;
  }

  const body = await client
    .get(`v1/policy-engine/policy-bundles/${bundleId}/versions`, {
      searchParams,
    })
    .json<PolicyBundleVersionListResponse>();

  printResult(this.process.stdout, {
    json,
    data: body,
    renderTable: () => {
      if (body.nodes.length === 0) {
        return `No versions found for bundle "${bundleName}".`;
      }

      const rows = body.nodes.map((version) => [
        version.id,
        version.version,
        version.createdAt,
        version.activatedAt ?? EMPTY_CELL,
        version.deactivatedAt ?? EMPTY_CELL,
      ]);

      let table = renderTable(['id', 'version', 'createdAt', 'activatedAt', 'deactivatedAt'], rows);
      if (body.pageInfo.endCursor) {
        table += `\n\nafter: ${body.pageInfo.endCursor}`;
      }
      return table;
    },
  });
}
