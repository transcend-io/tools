import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';
import { EMPTY_CELL } from '../constants.js';
import {
  buildPolicyEngineClient,
  policyEngineRequest,
  printResult,
  renderTable,
  resolveBundleIdByName,
  setPolicyEngineCliDebug,
} from '../helpers/index.js';
import type { PolicyBundleVersionListResponse } from '../types.js';

/** CLI flags for `transcend policy versions`. */
export interface VersionsCommandFlags {
  /** Tenant-unique bundle name */
  'bundle-name': string;
  /** Transcend API key */
  auth: string;
  /** Transcend API URL */
  'transcend-url': string;
  /** Page size */
  limit: number;
  /** Cursor from a previous page's pageInfo.endCursor */
  after?: string;
  /** Print raw JSON response */
  json: boolean;
  /** Include technical error details when a command fails */
  debug?: boolean;
}

/**
 * List versions for a policy bundle.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function versions(
  this: LocalContext,
  {
    'bundle-name': bundleName,
    auth,
    'transcend-url': transcendUrl,
    limit,
    after,
    json,
    debug = false,
  }: VersionsCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);
  setPolicyEngineCliDebug(debug);

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

  const body = await policyEngineRequest(
    client
      .get(`v1/policy-engine/policy-bundles/${bundleId}/versions`, {
        searchParams,
      })
      .json<PolicyBundleVersionListResponse>(),
  );

  printResult(this.process.stdout, {
    json,
    data: body,
    renderTable: () => {
      if (body.nodes.length === 0) {
        // Distinguish "this page is empty because you paginated past the end"
        // from "the bundle genuinely has no versions" — the latter is already
        // surfaced during version resolution upstream.
        return after
          ? `No more versions for bundle "${bundleName}" (end of results).`
          : `No versions found for bundle "${bundleName}".`;
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
