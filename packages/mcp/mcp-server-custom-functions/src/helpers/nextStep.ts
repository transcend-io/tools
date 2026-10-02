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
    `Review this function at ${url}. Fill Environment Variable values there — MCP only ` +
    'creates empty name placeholders; do not pass credentials through tools. Allowed hosts ' +
    'are not shown in the Admin Dashboard; confirm them via upsert response or ' +
    'custom_functions_get_code.'
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
    | 'promoted'
    | 'storedTestPassed'
    | 'storedTestNeedsSave'
    | 'unsavedTestPassed';
  /** Custom function ID */
  id: string;
  /** Draft version ID when a pending draft exists */
  draftVersionId?: string;
  /** Env var names verified on the readable version (user fills values) */
  envVarNames?: string[];
}): string {
  const envFillHint =
    input.envVarNames && input.envVarNames.length > 0
      ? `Ask the user to fill dashboard Environment Variable values for: ${input.envVarNames.join(
          ', ',
        )}. Do not pass secrets through MCP. `
      : 'Ask the user to set any Environment Variables (API keys, secrets) in the dashboard ' +
        'Environment Variables tab — do not pass secrets through MCP. ';

  switch (input.kind) {
    case 'created':
      return (
        envFillHint +
        `Optional: custom_functions_test_run { id: "${input.id}" } (omit code). ` +
        'Testing is optional; save does not require it.'
      );
    case 'draft': {
      const draftEnvHint =
        input.envVarNames && input.envVarNames.length > 0
          ? `Env var names (${input.envVarNames.join(', ')}) are on draft ` +
            `"${input.draftVersionId}" — promote before treating them as live. ` +
            'Do not pass secrets through MCP. '
          : '';
      return (
        draftEnvHint +
        `Call custom_functions_promote_version with customFunctionId "${input.id}" ` +
        `and versionId "${input.draftVersionId}".`
      );
    }
    case 'promoted':
      return (
        envFillHint +
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
