const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

/** Prominent failure output: GitHub Actions annotations (::error::) or ANSI red locally. */
export function prominentError(title: string, message: string): void {
  if (isGithubActions) {
    // GitHub's raw step logs only style the first line of multiline annotations.
    const summary = message.replace(/\s*\n\s*/g, ' ');
    const escaped = escapeGithubActionsValue(summary);
    console.error(`::error title=${title}::${escaped}`);
    return;
  }

  const boldRed = '\x1b[1;31m';
  const reset = '\x1b[0m';
  console.error(`${boldRed}${message}${reset}`);
}

export function logGroup(title: string, lines: string[]): void {
  if (isGithubActions) {
    console.error(`::group::${escapeGithubActionsValue(title)}`);

    for (const line of lines) {
      console.error(line);
    }

    console.error('::endgroup::');
    return;
  }

  console.error('');
  console.error(`${title}:`);

  for (const line of lines) {
    console.error(line);
  }
}

function escapeGithubActionsValue(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}
