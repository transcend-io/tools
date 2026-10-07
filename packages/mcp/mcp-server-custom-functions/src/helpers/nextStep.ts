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
 * Hint that secrets belong in the dashboard Environment Variables tab.
 *
 * @param dashboardUrl - Resolved admin dashboard origin
 * @param functionId - Custom function ID
 * @returns Dashboard hint including the deep link
 */
export function customFunctionDashboardHint(dashboardUrl: string, functionId: string): string {
  const url = customFunctionDashboardUrl(dashboardUrl, functionId);
  return (
    `Review this function at ${url}. Fill unset Environment Variable values in the dashboard — ` +
    'MCP only declares names and plain values; secrets are dashboard-only. Allowed hosts are not ' +
    'shown in the Admin Dashboard; confirm them via custom_functions_get_code.'
  );
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
    | 'metadataUpdated'
    | 'promoted'
    | 'storedTestPassed'
    | 'storedTestNoDraft'
    | 'storedTestNeedsSave'
    | 'unsavedTestPassed'
    | 'testFailed';
  /** Custom function ID */
  id: string;
  /** Draft version ID when a pending draft exists */
  draftVersionId?: string;
  /** Env keys still needing dashboard values */
  unsetEnvKeys?: string[];
}): string {
  const envFillHint =
    input.unsetEnvKeys && input.unsetEnvKeys.length > 0
      ? `Ask the user to fill dashboard Environment Variable values for: ${input.unsetEnvKeys.join(
          ', ',
        )}. Do not pass secrets through MCP. `
      : '';

  switch (input.kind) {
    case 'created':
      return (
        envFillHint +
        (input.draftVersionId
          ? `Call custom_functions_test_run { id: "${input.id}" }, then custom_functions_promote_version.`
          : `Optional: custom_functions_test_run { id: "${input.id}" } (omit code).`)
      );
    case 'metadataUpdated':
      return `Updated name/description for "${input.id}" without creating a new version.`;
    case 'draft':
      return (
        envFillHint +
        `Call custom_functions_test_run { id: "${input.id}" } (omit code), then ` +
        `custom_functions_promote_version with customFunctionId "${input.id}" and versionId ` +
        `"${input.draftVersionId}".`
      );
    case 'promoted':
      return (
        envFillHint +
        `Optional: custom_functions_test_run { id: "${input.id}" } to re-verify after promotion.`
      );
    case 'storedTestPassed':
      return (
        'version.successfulTestRun should now be true; confirm with custom_functions_get_code or ' +
        'custom_functions_list, then custom_functions_promote_version if a draft is pending.'
      );
    case 'storedTestNoDraft':
      return 'Test passed against the active version; no pending draft to mark tested.';
    case 'storedTestNeedsSave':
      return `Call custom_functions_upsert with id "${input.id}" and this code to persist a draft.`;
    case 'unsavedTestPassed':
      return input.id
        ? `Call custom_functions_upsert with id "${input.id}" and this code to persist a draft.`
        : 'Call custom_functions_upsert with this code to persist a new Custom Function.';
    case 'testFailed':
      return (
        `Test failed (passed: false). Fix the code, call custom_functions_upsert with id ` +
        `"${input.id}" (omit versionId to continue the draft), then custom_functions_test_run again.`
      );
  }
}
