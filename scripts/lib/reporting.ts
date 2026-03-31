const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
import { logger } from '../logger.js';

/** Prominent failure output: GitHub Actions annotations (::error::) or ANSI red locally. */
export function prominentError(title: string, message: string): void {
  if (isGithubActions) {
    // GitHub's raw step logs only style the first line of multiline annotations.
    const summary = message.replace(/\s*\n\s*/g, ' ');
    const escaped = escapeGithubActionsValue(summary);
    logger.error(`::error title=${title}::${escaped}`);
    return;
  }

  const boldRed = '\x1b[1;31m';
  const reset = '\x1b[0m';
  logger.error(`${boldRed}${message}${reset}`);
}

export function logGroup(title: string, lines: string[]): void {
  if (isGithubActions) {
    logger.error(`::group::${escapeGithubActionsValue(title)}`);

    for (const line of lines) {
      logger.error(line);
    }

    logger.error('::endgroup::');
    return;
  }

  logger.error('');
  logger.error(`${title}:`);

  for (const line of lines) {
    logger.error(line);
  }
}

function escapeGithubActionsValue(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}
