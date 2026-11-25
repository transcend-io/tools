import { readFileSync } from 'node:fs';

import {
  collectGhPrText,
  findPrContentIssues,
  formatPrContentFindings,
  isGhPrWriteCommand,
} from './lib/pr-content.ts';
import { logger } from './logger.ts';

/**
 * Block customer-specific content in public PR text.
 *
 * Modes:
 * - default (CI): scan `PR_TITLE` and `PR_BODY` from the environment.
 * - `--stdin`: scan text from stdin.
 * - `--hook`: read a Cursor `beforeShellExecution` payload from stdin and answer allow or deny
 *   as hook JSON. Only `gh pr create|edit|comment|review` commands are scanned.
 */
const mode = process.argv.includes('--hook')
  ? 'hook'
  : process.argv.includes('--stdin')
    ? 'stdin'
    : 'env';

if (mode === 'hook') {
  runHook();
} else {
  runCheck();
}

function runCheck(): void {
  const text =
    mode === 'stdin'
      ? readFileSync(0, 'utf8')
      : [process.env.PR_TITLE, process.env.PR_BODY].filter(Boolean).join('\n');
  const findings = findPrContentIssues(text);

  if (findings.length === 0) {
    logger.log('No customer-specific content found in PR text.');
    return;
  }

  logger.error(
    [
      'This repo is public. Remove customer-specific content from the PR title and body:',
      formatPrContentFindings(findings),
      '',
      'After you edit the body, delete the old revision from the PR edit history (the "edited" menu on the description), because GitHub keeps it.',
    ].join('\n'),
  );
  process.exit(1);
}

function runHook(): void {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}') as {
    command?: string;
    cwd?: string;
  };
  const command = input.command ?? '';

  if (!isGhPrWriteCommand(command)) {
    logger.log(JSON.stringify({ permission: 'allow' }));
    return;
  }

  const findings = findPrContentIssues(collectGhPrText(command, input.cwd ?? process.cwd()));

  if (findings.length === 0) {
    logger.log(JSON.stringify({ permission: 'allow' }));
    return;
  }

  const details = formatPrContentFindings(findings);
  logger.log(
    JSON.stringify({
      permission: 'deny',
      user_message: `Blocked: this PR text has customer-specific content for the public tools repo.\n${details}`,
      agent_message: [
        'Blocked by the public-pr-content hook. transcend-io/tools is public, so PR titles, bodies, intent notes, and comments must not contain customer names, org or request IDs, emails, or internal links.',
        'Rewrite the text without these, then retry. Do not post through another route such as `gh api`.',
        details,
      ].join('\n'),
    }),
  );
}
