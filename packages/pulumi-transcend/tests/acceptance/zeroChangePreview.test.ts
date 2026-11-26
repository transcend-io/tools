import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
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

function pulumiEnv(passphrase: string, backendUrl: string): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.TRANSCEND_ACCEPTANCE_API_KEY;
  return {
    ...env,
    PULUMI_BACKEND_URL: backendUrl,
    PULUMI_CONFIG_PASSPHRASE: passphrase,
    PULUMI_SKIP_UPDATE_CHECK: 'true',
  };
}

function runPulumi(args: string[], cwd: string, env: NodeJS.ProcessEnv): string {
  return execFileSync('pulumi', args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
    env,
    timeout: 180_000,
  });
}

function setStackSecret(
  cwd: string,
  env: NodeJS.ProcessEnv,
  configKey: string,
  value: string,
): void {
  const result = spawnSync('pulumi', ['config', 'set', '--secret', configKey, '--stdin'], {
    cwd,
    input: value,
    encoding: 'utf8',
    env,
    timeout: 180_000,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'pulumi config set failed');
  }
}

describeAcceptance('pulumi acceptance', () => {
  const stacks: { name: string; backendDir: string; passphrase: string }[] = [];

  afterEach(() => {
    for (const { name, backendDir, passphrase } of stacks) {
      const env = pulumiEnv(passphrase, `file://${backendDir}`);
      try {
        runPulumi(['stack', 'select', name], workspaceDir, env);
        runPulumi(['destroy', '--yes', '--skip-preview'], workspaceDir, env);
        runPulumi(['stack', 'rm', name, '--yes', '--force'], workspaceDir, env);
      } catch {
        try {
          runPulumi(['stack', 'rm', name, '--yes', '--force'], workspaceDir, env);
        } catch {
          // Best-effort cleanup after a failed run.
        }
      }
      rmSync(backendDir, { recursive: true, force: true });
    }
    stacks.length = 0;
  });

  it('reports no changes on the second preview', () => {
    const artifacts = mkdtempSync(path.join(tmpdir(), 'pulumi-plugin-pack-'));
    const backendDir = mkdtempSync(path.join(tmpdir(), 'pulumi-acceptance-state-'));
    const passphrase = randomBytes(24).toString('hex');
    const env = pulumiEnv(passphrase, `file://${backendDir}`);

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
        env,
      );

      const stackName = `accept-${Date.now()}`;
      stacks.push({ name: stackName, backendDir, passphrase });

      runPulumi(['login', `file://${backendDir}`], workspaceDir, env);
      runPulumi(['install'], workspaceDir, env);
      runPulumi(
        ['stack', 'init', stackName, '--secrets-provider', 'passphrase'],
        workspaceDir,
        env,
      );
      setStackSecret(workspaceDir, env, 'transcend:apiKey', apiKey!);

      runPulumi(['up', '--yes', '--skip-preview'], workspaceDir, env);

      expect(() => {
        runPulumi(['preview', '--expect-no-changes', '--non-interactive'], workspaceDir, env);
      }).not.toThrow();
    } finally {
      rmSync(artifacts, { recursive: true, force: true });
    }
  }, 300_000);
});
