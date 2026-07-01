import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';
import { EMPTY_CELL } from '../constants.js';
import { buildPolicyEngineClient, printResult, renderTable } from '../helpers/index.js';
import type { PolicyBundleListResponse } from '../types.js';

/** CLI flags for `transcend policy list`. */
export interface ListCommandFlags {
  /** Transcend API key */
  auth: string;
  /** Transcend API URL */
  transcendUrl: string;
  /** Page size */
  limit: number;
  /** Number of records to skip */
  offset: number;
  /** Print raw JSON response */
  json: boolean;
}

/**
 * List policy bundles for the current organization.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function list(
  this: LocalContext,
  { auth, transcendUrl, limit, offset, json }: ListCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const client = buildPolicyEngineClient(transcendUrl, auth);

  logger.info(colors.green('Listing policy bundles...'));

  const body = await client
    .get('v1/policy-engine/policy-bundles', {
      searchParams: { limit, offset },
    })
    .json<PolicyBundleListResponse>();

  printResult(this.process.stdout, {
    json,
    data: body,
    renderTable: () => {
      if (body.nodes.length === 0) {
        return 'No policy bundles found.';
      }

      const rows = body.nodes.map((bundle) => [
        bundle.id,
        bundle.bundleName,
        bundle.activeVersionId ?? EMPTY_CELL,
        bundle.lastActivatedAt ?? EMPTY_CELL,
        bundle.createdAt,
      ]);

      let table = renderTable(
        ['id', 'bundleName', 'activeVersionId', 'lastActivatedAt', 'createdAt'],
        rows,
      );
      table += `\n\ntotalCount: ${body.totalCount}`;
      if (offset + body.nodes.length < body.totalCount) {
        table += `\nnextOffset: ${offset + body.nodes.length}`;
      }
      return table;
    },
  });
}
