import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { collectGhPrText, findPrContentIssues, isGhPrWriteCommand } from './lib/pr-content.ts';

const scriptPath = fileURLToPath(new URL('./check-pr-content.ts', import.meta.url));
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('findPrContentIssues', () => {
  it.each([
    ['Slack link', 'see https://transcend-inc.slack.com/archives/C021/p1792', 'internal-link'],
    ['Retool link', 'https://app.retoolcloud.transcend.io/apps/foo', 'internal-link'],
    ['Gong link', 'call: https://app.gong.io/call?id=1', 'internal-link'],
    ['Intercom link', 'https://app.intercom.com/a/inbox/abc', 'internal-link'],
    ['Datadog link', 'https://app.datadoghq.com/logs?query=x', 'internal-link'],
    ['Notion link', 'https://www.notion.so/page-123', 'internal-link'],
    ['Google doc link', 'https://docs.google.com/document/d/abc', 'internal-link'],
    ['admin dashboard link', 'https://app.transcend.io/admin/requests/1', 'admin-dashboard-link'],
    [
      'Linear slug link',
      'https://linear.app/transcend/issue/SUP-368/acme-sync-broken',
      'linear-slug-link',
    ],
    ['UUID', 'org 3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d is slow', 'uuid'],
    ['customer email', 'reported by alice@acme.com', 'email'],
  ])('flags a %s', (_name, text, rule) => {
    expect(findPrContentIssues(text).map((finding) => finding.rule)).toContain(rule);
  });

  it.each([
    ['public docs link', 'https://docs.transcend.io/docs/articles/overview/glossary'],
    ['Datadog docs link', 'https://docs.datadoghq.com/bits_ai/mcp_server/setup/'],
    ['bare Linear ID', 'Ref SUP-368'],
    ['Linear link without slug', 'https://linear.app/transcend/issue/SUP-368'],
    ['GitHub link', 'https://github.com/transcend-io/tools/actions/runs/1'],
    ['npm spec', 'bump zod@4.6.6 and @transcend-io/mcp@1.9.1'],
    ['prerelease npm spec', 'tsdown@0.21.10-beta.1'],
    ['GitHub mention', 'thanks @michaelfarrell76'],
    ['git remote', 'git@github.com:transcend-io/tools.git'],
    ['Transcend email', 'security@transcend.io'],
    ['placeholder email', 'user@example.com'],
    ['noreply email', '12345+someone@users.noreply.github.com'],
    ['short hex', 'commit bc3f4938'],
  ])('allows a %s', (_name, text) => {
    expect(findPrContentIssues(text)).toEqual([]);
  });

  it('reports line numbers and masks the match', () => {
    const [finding] = findPrContentIssues('first line\nreach me at jordan.smith@bigcorp.com');

    expect(finding?.line).toBe(2);
    expect(finding?.preview).not.toContain('bigcorp.com');
  });
});

describe('isGhPrWriteCommand', () => {
  it.each(['gh pr create --title x', 'gh pr edit 12 --body y', 'cd a && gh pr comment 1 -b hi'])(
    'matches %s',
    (command) => {
      expect(isGhPrWriteCommand(command)).toBe(true);
    },
  );

  it.each(['gh pr view 12', 'gh pr list --json title', 'gh pr checks 12'])(
    'ignores %s',
    (command) => {
      expect(isGhPrWriteCommand(command)).toBe(false);
    },
  );
});

describe('collectGhPrText', () => {
  it('includes --body-file contents resolved against cwd', () => {
    const directory = makeDirectory();
    writeFileSync(join(directory, 'body.md'), 'contact alice@acme.com');

    const text = collectGhPrText('gh pr create --body-file body.md', directory);

    expect(findPrContentIssues(text).map((finding) => finding.rule)).toEqual(['email']);
  });

  it('handles quoted paths, -F, and missing files', () => {
    const directory = makeDirectory();
    writeFileSync(join(directory, 'my body.md'), 'ok');

    expect(collectGhPrText('gh pr edit 1 -F "my body.md"', directory)).toContain('ok');
    expect(collectGhPrText('gh pr edit 1 -F missing.md', directory)).toBe(
      'gh pr edit 1 -F missing.md',
    );
  });
});

describe('--hook mode', () => {
  it('allows commands that are not gh pr writes', () => {
    expect(runHook({ command: 'ls https://x.slack.com/a' })).toEqual({ permission: 'allow' });
  });

  it('allows a clean gh pr create', () => {
    expect(runHook({ command: 'gh pr create --title "Fix push" --body "Ref SUP-368"' })).toEqual({
      permission: 'allow',
    });
  });

  it('denies inline customer content and masks it in the message', () => {
    const result = runHook({
      command: 'gh pr create --title t --body "from jordan.smith@bigcorp.com"',
    });

    expect(result.permission).toBe('deny');
    expect(result.agent_message).toContain('[email]');
    expect(result.agent_message).not.toContain('bigcorp.com');
  });

  it('denies customer content in a body file', () => {
    const directory = makeDirectory();
    writeFileSync(join(directory, 'body.md'), 'https://transcend-inc.slack.com/archives/C1/p1');

    expect(
      runHook({ command: 'gh pr edit 3 --body-file body.md', cwd: directory }).permission,
    ).toBe('deny');
  });
});

describe('default (CI) mode', () => {
  it('fails when the body has customer content', () => {
    const result = runScript([], {
      PR_TITLE: 'Fix',
      PR_BODY: 'org 3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[uuid]');
    expect(result.stderr).not.toContain('3f2b8c1e-9a4d');
  });

  it('passes a clean title and an empty body', () => {
    expect(runScript([], { PR_TITLE: 'Fix push' }).status).toBe(0);
  });
});

function makeDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'pr-content-'));
  temporaryDirectories.push(directory);
  return directory;
}

function runScript(args: string[], env: Record<string, string>, input = '') {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', ...env },
    input,
  });
}

function runHook(payload: { command: string; cwd?: string }): {
  permission: string;
  agent_message?: string;
} {
  const result = runScript(['--hook'], {}, JSON.stringify({ cwd: tmpdir(), ...payload }));
  return JSON.parse(result.stdout) as { permission: string; agent_message?: string };
}
