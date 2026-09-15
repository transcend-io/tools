/**
 * Deep link to a Custom Function in Developer Tools → Custom Functions.
 *
 * @param dashboardUrl - Resolved admin dashboard origin
 * @param functionId - Custom function ID
 * @returns Dashboard URL including functionId
 */
export function customFunctionDashboardUrl(dashboardUrl: string, functionId: string): string {
  const base = dashboardUrl.replace(/\/+$/, '');
  return `${base}/infrastructure/functions?functionId=${functionId}`;
}

/**
 * Agent-facing next tool call after a Custom Functions mutation.
 *
 * @param input - Success path and IDs to interpolate
 * @returns A single-sentence nextStep string
 */
export function customFunctionNextStep(input: {
  /** Which success path produced this hint */
  kind:
    | 'created'
    | 'draft'
    | 'promoted'
    | 'storedTestPassed'
    | 'storedTestNeedsSave'
    | 'unsavedTestPassed';
  /** Custom function ID */
  id: string;
  /** Draft version ID when a pending draft exists */
  draftVersionId?: string;
}): string {
  switch (input.kind) {
    case 'created':
      return (
        `Optional: custom_functions_test_run { id: "${input.id}" } (omit code). ` +
        'Testing is optional; save does not require it.'
      );
    case 'draft':
      return (
        `Call custom_functions_promote_version with customFunctionId "${input.id}" ` +
        `and versionId "${input.draftVersionId}".`
      );
    case 'promoted':
      return (
        `Optional: custom_functions_test_run { id: "${input.id}" } (omit code). ` +
        'Testing is optional; save does not require it.'
      );
    case 'storedTestPassed':
      return (
        'version.successfulTestRun should now be true; confirm with ' +
        'custom_functions_get_code or custom_functions_list.'
      );
    case 'storedTestNeedsSave':
      return (
        'Execution passed. Upsert this code or pass testPayloads to set successfulTestRun; ' +
        'save does not require it.'
      );
    case 'unsavedTestPassed':
      return input.id
        ? `Call custom_functions_upsert with id "${input.id}" and this code to persist a draft.`
        : 'Call custom_functions_upsert with this code to persist a new Custom Function.';
  }
}
