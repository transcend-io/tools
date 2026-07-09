import type { WorkflowConfigNode } from './fetchAllWorkflowConfigs.js';
import type { WorkflowConfigSyncInput } from './syncWorkflowConfigs.js';

/** Fields used to resolve a workflow config match */
export type WorkflowConfigMatchInput = Pick<
  WorkflowConfigSyncInput,
  'internal-name' | 'title' | 'action-type' | 'data-subject-type' | 'region-list'
>;

/** Result of resolving a workflow config match */
export type WorkflowConfigMatchResolution =
  | {
      /** Matched an existing workflow config */
      kind: 'match';
      /** Matched workflow config */
      config: WorkflowConfigNode;
    }
  | {
      /** No existing workflow config matched; create a new one */
      kind: 'create';
    }
  | {
      /** Multiple workflow configs matched after the full cascade */
      kind: 'ambiguous';
      /** Ambiguous workflow config candidates */
      candidates: WorkflowConfigNode[];
    };

/**
 * Stable key for title + action + data subject + region-list identity.
 *
 * @param config - Workflow config node
 * @returns Match key string
 */
export function workflowConfigMatchKey(config: WorkflowConfigNode): string {
  return [
    config.title.defaultMessage,
    config.action.type,
    config.subject?.type ?? '',
    workflowRegionListKey(config.regionList),
  ].join('\0');
}

/**
 * Order-independent region list key for workflow matching.
 *
 * @param regions - Region list
 * @returns Sorted comma-separated region codes
 */
export function workflowRegionListKey(regions: readonly string[] | undefined | null): string {
  return [...(regions ?? [])].sort().join(',');
}

/**
 * Human-readable label for logging and errors.
 *
 * @param input - Workflow config sync input
 * @returns Label string
 */
export function workflowConfigInputLabel(input: WorkflowConfigSyncInput): string {
  return input['internal-name'] ?? input.title;
}

function sameRegionList(
  inputRegions: WorkflowConfigMatchInput['region-list'],
  configRegions: WorkflowConfigNode['regionList'],
): boolean {
  return workflowRegionListKey(inputRegions) === workflowRegionListKey(configRegions);
}

function narrowToOneOrContinue(
  candidates: WorkflowConfigNode[],
  next: (remaining: WorkflowConfigNode[]) => WorkflowConfigMatchResolution,
): WorkflowConfigMatchResolution {
  const [only] = candidates;
  if (candidates.length === 1 && only !== undefined) {
    return { kind: 'match', config: only };
  }
  if (candidates.length === 0) {
    return { kind: 'create' };
  }
  return next(candidates);
}

function continueCascade(
  candidates: WorkflowConfigNode[],
  input: WorkflowConfigMatchInput,
): WorkflowConfigMatchResolution {
  return narrowToOneOrContinue(
    candidates.filter((config) => config.title.defaultMessage === input.title),
    (byTitle) =>
      narrowToOneOrContinue(
        byTitle.filter((config) => config.action.type === input['action-type']),
        (byAction) => {
          const dataSubjectType = input['data-subject-type'];
          if (dataSubjectType) {
            return narrowToOneOrContinue(
              byAction.filter((config) => config.subject?.type === dataSubjectType),
              (bySubject) => filterByRegions(bySubject, input),
            );
          }
          return filterByRegions(byAction, input);
        },
      ),
  );
}

function filterByRegions(
  candidates: WorkflowConfigNode[],
  input: WorkflowConfigMatchInput,
): WorkflowConfigMatchResolution {
  const matches = candidates.filter((config) =>
    sameRegionList(input['region-list'], config.regionList),
  );
  const [only] = matches;
  if (matches.length === 1 && only !== undefined) {
    return { kind: 'match', config: only };
  }
  if (matches.length === 0) {
    return { kind: 'create' };
  }

  // When YAML omits internal-name, prefer unnamed candidates so a named
  // sibling with the same title/action/subject/regions is not treated as
  // ambiguous (common after pull when only some workflows have internal names).
  // If multiple unnamed remain, pick the first in stable fetch order — sync
  // claims matched ids so later identical YAML rows map to the rest.
  // TODO: https://linear.app/transcend/issue/WAL-10312 - remove once internalName is unique in DB
  if (!input['internal-name']) {
    const unnamed = matches.filter((config) => config.internalName == null);
    const [firstUnnamed] = unnamed;
    if (firstUnnamed !== undefined) {
      return { kind: 'match', config: firstUnnamed };
    }
  }

  return { kind: 'ambiguous', candidates: matches };
}

/**
 * Resolve which existing workflow config a YAML entry should update, if any.
 *
 * Cascade order: internal-name → title → action-type → data-subject-type (when
 * provided) → region-list. A provided internal-name with zero matches creates a
 * new workflow instead of falling through to title. When internal-name is
 * omitted and the cascade still matches multiple configs, prefer the candidate
 * with a null internal name.
 *
 * @param input - Workflow config sync input
 * @param existingConfigs - Existing workflow configs in the org
 * @returns Match resolution
 */
export function resolveWorkflowConfigMatch(
  input: WorkflowConfigMatchInput,
  existingConfigs: WorkflowConfigNode[],
): WorkflowConfigMatchResolution {
  const internalName = input['internal-name'];

  if (internalName) {
    const byName = existingConfigs.filter((config) => config.internalName === internalName);
    const [onlyByName] = byName;
    if (byName.length === 1 && onlyByName !== undefined) {
      return { kind: 'match', config: onlyByName };
    }
    if (byName.length === 0) {
      return { kind: 'create' };
    }
    return continueCascade(byName, input);
  }

  return continueCascade(existingConfigs, input);
}
