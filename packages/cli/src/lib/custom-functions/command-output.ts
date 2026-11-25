import type {
  CustomFunctionLifecycleState,
  CustomFunctionPayloadType,
  CustomFunctionType,
  CustomFunctionVersionLifecycleState,
} from '@transcend-io/privacy-types';
import type { CustomFunction, CustomFunctionSyncResult } from '@transcend-io/sdk';

import { CUSTOM_FUNCTION_RESULT_VERSION } from './scaffold-model.js';

/** Safe Custom Function version metadata exposed by `list --json`. */
export interface CustomFunctionVersionJson {
  /** Version ID. */
  id: string;
  /** Monotonic version number. */
  versionNumber: string;
  /** Version lifecycle state. */
  lifecycleState: CustomFunctionVersionLifecycleState;
}

/** Safe Custom Function metadata exposed by `list --json`. */
export interface CustomFunctionListItemJson {
  /** Custom Function ID. */
  id: string;
  /** Display name. */
  name: string;
  /** Customer-provided description. */
  description: string | null;
  /** Product-facing Custom Function type. */
  type: CustomFunctionType;
  /** Custom Function lifecycle state. */
  lifecycleState: CustomFunctionLifecycleState;
  /** Sombra gateway ID. */
  sombraId: string | null;
  /** Linked DSR integration ID. */
  dataSiloId: string | null;
  /** Whether a newer draft is pending. */
  hasPendingDraft: boolean;
  /** Current active version metadata. */
  activeVersion: CustomFunctionVersionJson | null;
  /** Pending draft version metadata. */
  draftVersion: CustomFunctionVersionJson | null;
}

/** Stable result emitted by `custom-functions list --json`. */
export interface CustomFunctionListJsonResult {
  /** JSON contract version. */
  version: typeof CUSTOM_FUNCTION_RESULT_VERSION;
  /** Command that produced this result. */
  command: 'list';
  /** Custom Functions sorted by display name. */
  functions: CustomFunctionListItemJson[];
}

/** Safe test-run summary emitted by `push --json`. */
export interface CustomFunctionPushTestJson {
  /** Whether the test payload passed. */
  passed: boolean;
  /** DSR export selected by the test payload. */
  payloadType?: CustomFunctionPayloadType;
  /** Function process exit code. */
  exitCode: number;
  /** Execution error message. */
  error: string | null;
  /** Wall-clock execution time in milliseconds. */
  timeMs: number;
}

/** Safe sync result emitted by `push --json`. */
export interface CustomFunctionPushSyncResultJson {
  /** Function sync outcome. */
  outcome: CustomFunctionSyncResult['outcome'];
  /** Existing or newly assigned Custom Function ID. */
  customFunctionId?: string;
  /** Existing or newly assigned revision number. */
  versionNumber?: string;
  /** Fields that drove an update. */
  changedFields: string[];
  /** Whether the revision was promoted to active. */
  promoted: boolean;
  /** Test payload summaries without function logs. */
  testResults?: CustomFunctionPushTestJson[];
  /** Linked DSR integration ID. */
  dataSiloId?: string;
  /** Whether this sync created a DSR integration. */
  createdDataSilo?: boolean;
}

/** One function-level result emitted by `push --json`. */
export interface CustomFunctionPushItemJson {
  /** Manifest display name. */
  name: string;
  /** Successful or rejected sync result. */
  result?: CustomFunctionPushSyncResultJson;
  /** Failure message when the function could not be processed. */
  error?: string;
}

/** Aggregate counts emitted by `push --json`. */
export interface CustomFunctionPushSummaryJson {
  /** Functions created or that would be created. */
  created: number;
  /** Functions updated or that would be updated. */
  updated: number;
  /** Functions with metadata-only updates. */
  metadataUpdated: number;
  /** Functions skipped because nothing changed. */
  skipped: number;
  /** Functions rejected by failing tests. */
  rejected: number;
  /** Functions that failed before producing a sync result. */
  failed: number;
}

/** Stable result emitted by `custom-functions push --json`. */
export interface CustomFunctionPushJsonResult {
  /** JSON contract version. */
  version: typeof CUSTOM_FUNCTION_RESULT_VERSION;
  /** Command that produced this result. */
  command: 'push';
  /** Overall command status. */
  status: 'passed' | 'failed';
  /** Absolute manifest path. */
  manifestPath: string;
  /** Whether this invocation only previewed remote changes. */
  dryRun: boolean;
  /** Aggregate outcome counts. */
  summary: CustomFunctionPushSummaryJson;
  /** Manifest-order function outcomes. */
  functions: CustomFunctionPushItemJson[];
}

/**
 * Remove signed code tokens from Custom Function list output.
 *
 * @param customFunctions - API results
 * @returns Stable, safe JSON result
 */
export function buildCustomFunctionListJsonResult(
  customFunctions: readonly CustomFunction[],
): CustomFunctionListJsonResult {
  const toVersion = (
    version: NonNullable<CustomFunction['activeVersion']> | undefined | null,
  ): CustomFunctionVersionJson | null =>
    version
      ? {
          id: version.id,
          versionNumber: version.versionNumber,
          lifecycleState: version.lifecycleState,
        }
      : null;

  return {
    version: CUSTOM_FUNCTION_RESULT_VERSION,
    command: 'list',
    functions: [...customFunctions]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((customFunction) => ({
        id: customFunction.id,
        name: customFunction.name,
        description: customFunction.description ?? null,
        type: customFunction.type,
        lifecycleState: customFunction.lifecycleState,
        sombraId: customFunction.sombraId ?? null,
        dataSiloId: customFunction.dataSiloId ?? null,
        hasPendingDraft: customFunction.hasPendingDraft,
        activeVersion: toVersion(customFunction.activeVersion),
        draftVersion: toVersion(customFunction.draftVersion),
      })),
  };
}

/**
 * Build the stable aggregate result for a Custom Function push.
 *
 * @param manifestPath - Absolute manifest path
 * @param dryRun - Whether remote changes were previewed
 * @param functions - Manifest-order function outcomes
 * @returns Stable JSON result
 */
export function buildCustomFunctionPushJsonResult(
  manifestPath: string,
  dryRun: boolean,
  functions: readonly {
    /** Manifest display name. */
    name: string;
    /** Successful or rejected sync result. */
    result?: CustomFunctionSyncResult;
    /** Failure before a sync result was produced. */
    error?: Error;
  }[],
): CustomFunctionPushJsonResult {
  const count = (outcome: CustomFunctionSyncResult['outcome']): number =>
    functions.filter(({ result }) => result?.outcome === outcome).length;
  const rejected = count('test-failed');
  const failed = functions.filter(({ error }) => error !== undefined).length;
  const toResult = ({
    outcome,
    customFunctionId,
    versionNumber,
    changedFields,
    promoted,
    testResults,
    dataSiloId,
    createdDataSilo,
  }: CustomFunctionSyncResult): CustomFunctionPushSyncResultJson => ({
    outcome,
    changedFields,
    promoted,
    ...(customFunctionId ? { customFunctionId } : {}),
    ...(versionNumber ? { versionNumber } : {}),
    ...(testResults
      ? {
          testResults: testResults.map(({ passed, payloadType, result }) => ({
            passed,
            ...(payloadType ? { payloadType } : {}),
            exitCode: result.exitCode,
            error: result.error?.message ?? null,
            timeMs: result.profile.timeMs,
          })),
        }
      : {}),
    ...(dataSiloId ? { dataSiloId } : {}),
    ...(createdDataSilo !== undefined ? { createdDataSilo } : {}),
  });

  return {
    version: CUSTOM_FUNCTION_RESULT_VERSION,
    command: 'push',
    status: rejected > 0 || failed > 0 ? 'failed' : 'passed',
    manifestPath,
    dryRun,
    summary: {
      created: count('created') + count('would-create'),
      updated: count('updated') + count('would-update'),
      metadataUpdated: count('metadata-updated'),
      skipped: count('skipped'),
      rejected,
      failed,
    },
    functions: functions.map(({ name, result, error }) => ({
      name,
      ...(result ? { result: toResult(result) } : {}),
      ...(error ? { error: error.message } : {}),
    })),
  };
}
