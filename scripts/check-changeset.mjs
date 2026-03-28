import { execFileSync } from 'node:child_process';

/** Prominent failure output: GitHub Actions annotations (::error::) or ANSI red locally. */
function prominentError(title, bodyLines) {
  const body = bodyLines.join('\n');
  if (process.env.GITHUB_ACTIONS === 'true') {
    const escaped = body.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    console.error(`::error title=${title}::${escaped}`);
  } else {
    const boldRed = '\x1b[1;31m';
    const reset = '\x1b[0m';
    console.error(`${boldRed}${body}${reset}`);
  }
}

const baseRef =
  process.env.CHANGESET_BASE_SHA ??
  (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main');

const changedFiles = getChangedFiles(baseRef);
const hasRelevantPackageChange = changedFiles.some(isRelevantPublishablePackageChange);
const hasChangeset = changedFiles.some(isChangesetFile);

if (!hasRelevantPackageChange || hasChangeset) {
  process.exit(0);
}

const changedPackageFiles = changedFiles.filter(isRelevantPublishablePackageChange);

prominentError('Missing changeset', [
  'Publishable package changes were detected without a changeset. See CONTRIBUTING.md for more information.',
  'Run `pnpm changeset` and commit the generated file before merging.',
]);
console.error('');
console.error('Relevant changed files:');

for (const filePath of changedPackageFiles) {
  console.error(`- ${filePath}`);
}

process.exit(1);

function getChangedFiles(base) {
  try {
    const output = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
      encoding: 'utf8',
    });

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);

    console.error(`Failed to compare changes against ${base}.`);
    console.error(details);
    process.exit(1);
  }
}

function isChangesetFile(filePath) {
  return (
    filePath.startsWith('.changeset/') &&
    filePath.endsWith('.md') &&
    filePath !== '.changeset/README.md'
  );
}

function isRelevantPublishablePackageChange(filePath) {
  if (!filePath.startsWith('packages/')) {
    return false;
  }

  const [, packageName, ...rest] = filePath.split('/');
  const relativePath = rest.join('/');

  if (!packageName || !relativePath) {
    return false;
  }

  if (
    relativePath === 'README.md' ||
    relativePath.startsWith('.turbo/') ||
    relativePath.startsWith('dist/') ||
    relativePath.startsWith('node_modules/') ||
    relativePath.endsWith('.test.ts') ||
    relativePath.endsWith('.test.tsx') ||
    relativePath.endsWith('.spec.ts') ||
    relativePath.endsWith('.spec.tsx')
  ) {
    return false;
  }

  return true;
}
