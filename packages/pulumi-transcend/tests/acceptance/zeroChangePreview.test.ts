import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };

const apiKey = process.env.TRANSCEND_ACCEPTANCE_API_KEY;
const describeAcceptance = apiKey ? describe : describe.skip;

const packageRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const workspaceDir = path.join(packageRoot, 'tests/acceptance/workspace');

function runPulumi(args: string[], cwd: string, extraEnv?: Record<string, string>): void {
  execFileSync('pulumi', args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
    env: {
      ...process.env,
      PULUMI_CONFIG_PASSPHRASE: 'acceptance',
      PULUMI_SKIP_UPDATE_CHECK: 'true',
      ...extraEnv,
    },
    timeout: 180_000,
  });
}

describeAcceptance('pulumi acceptance', () => {
  const stacks: string[] = [];

  afterEach(() => {
    for (const stack of stacks) {
      try {
        runPulumi(['stack', 'rm', stack, '--yes'], workspaceDir);
      } catch {
        // Best-effort cleanup after a failed run.
      }
    }
    stacks.length = 0;
  });

  it('reports no changes on the second preview', () => {
    const artifacts = mkdtempSync(path.join(tmpdir(), 'pulumi-plugin-pack-'));
    try {
      execFileSync(
        'node',
        [path.join(packageRoot, 'scripts/pack-plugin.mjs'), '--out', artifacts],
        {
          cwd: packageRoot,
          stdio: 'inherit',
        },
      );

      const plat =
        process.platform === 'darwin'
          ? 'darwin'
          : process.platform === 'win32'
            ? 'windows'
            : 'linux';
      const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
      const tarball = path.join(
        artifacts,
        `pulumi-resource-transcend-v${packageJson.version}-${plat}-${arch}.tar.gz`,
      );

      runPulumi(
        ['plugin', 'install', 'resource', 'transcend', packageJson.version, '--file', tarball],
        workspaceDir,
      );

      const stackName = `accept-${Date.now()}`;
      stacks.push(stackName);

      runPulumi(['install'], workspaceDir);
      runPulumi(['stack', 'init', stackName, '--secrets-provider', 'passphrase'], workspaceDir);
      runPulumi(['config', 'set', '--secret', 'transcend:apiKey', apiKey!], workspaceDir);

      runPulumi(['up', '--yes', '--skip-preview'], workspaceDir);

      expect(() => {
        runPulumi(['preview', '--expect-no-changes', '--non-interactive'], workspaceDir);
      }).not.toThrow();
    } finally {
      rmSync(artifacts, { recursive: true, force: true });
    }
  }, 300_000);
});
