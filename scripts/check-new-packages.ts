import { execFileSync } from 'node:child_process';
import { relative } from 'node:path';

import { lookUpNpmPackage } from './lib/npm-registry.ts';
import { repoRoot } from './lib/repo-files.ts';
import { logGroup, prominentError } from './lib/reporting.ts';
import { logger } from './logger.ts';

type PnpmWorkspacePackage = {
  /** package.json name field (absent on the private workspace root). */
  name?: string;
  /** Absolute package directory. */
  path: string;
  /** When true, package is not published. */
  private?: boolean;
};

type PublishablePackage = {
  /** package.json name field. */
  name: string;
  /** Workspace path from repo root (e.g. packages/mcp/mcp-server-config). */
  directory: string;
};

try {
  await run();
} catch (error) {
  const details = error instanceof Error ? error.message : String(error);
  logger.error(details);
  process.exit(1);
}

/**
 * npm trusted publishing (OIDC) cannot create a package that does not exist yet. `changeset
 * publish` then fails that one package with ENEEDAUTH but still publishes everything else,
 * including dependents that 404 on install. Fail before anything publishes instead.
 */
async function run(): Promise<void> {
  const publishablePackages = getPublishablePackages();
  const lookups = await Promise.all(publishablePackages.map(({ name }) => lookUpNpmPackage(name)));
  const directoryByName = new Map(
    publishablePackages.map(({ name, directory }) => [name, directory]),
  );
  const missing = lookups.filter(({ outcome }) => outcome === 'missing');
  const errored = lookups.filter(({ outcome }) => outcome === 'error');

  if (missing.length === 0 && errored.length === 0) {
    logger.log(`All ${publishablePackages.length} publishable packages exist on npm.`);
    return;
  }

  if (missing.length > 0) {
    prominentError(
      'New package needs a manual first npm publish',
      `These packages are not on npm yet: ${missing.map(({ name }) => name).join(', ')}.\nnpm trusted publishing cannot create a new package, so releasing now would ship dependents that 404 on install. A maintainer must publish each one by hand first. See "How to fix" below.`,
    );
    logGroup(
      'Packages not on npm yet',
      missing.map(({ name }) => `- ${name} (${directoryByName.get(name)})`),
    );
    logGroup('How to fix', [
      '1. Check out the release commit (the Version Packages PR head, changeset-release/main), then run `pnpm install --frozen-lockfile && pnpm build`.',
      '2. Log in with `npm login`, then run `pnpm publish --access public --no-git-checks` from each package directory above. Use pnpm, not npm, so `workspace:` dependency ranges get rewritten.',
      '3. On npmjs.com, open each package > Settings > Trusted Publisher and add GitHub Actions with repository transcend-io/tools and workflow publish.yml.',
      '4. Re-run this check. If the Publish workflow already failed, re-run it from Actions > Publish > Run workflow (workflow_dispatch).',
    ]);
  }

  if (errored.length > 0) {
    prominentError(
      'Could not check npm for new packages',
      'The npm registry lookup failed, so this check cannot tell whether these packages need a manual first publish.\nRe-run the job. If it keeps failing, check https://status.npmjs.org.',
    );
    logGroup(
      'Failed lookups',
      errored.map(({ name, reason }) => `- ${name}: ${reason}`),
    );
  }

  process.exit(1);
}

function getPublishablePackages(): PublishablePackage[] {
  const output = execFileSync('pnpm', ['ls', '--recursive', '--depth', '-1', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return (JSON.parse(output) as PnpmWorkspacePackage[])
    .flatMap(({ name, path, private: isPrivate }) =>
      name && isPrivate !== true ? [{ name, directory: relative(repoRoot, path) }] : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}
