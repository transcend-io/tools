import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { generateGithubActionsWorkflow } from '../scaffold-artifacts.js';

describe('generateGithubActionsWorkflow', () => {
  it('generates pinned, least-privilege, credential-free checks', () => {
    const workflow = generateGithubActionsWorkflow({
      cliVersion: '10.27.4',
      targetDirectory: 'packages/custom-functions',
      manifestPath: 'packages/custom-functions/transcend-functions.yml',
    });

    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toMatch(/uses: actions\/checkout@[a-f0-9]{40} # v6/u);
    expect(workflow).toMatch(/uses: denoland\/setup-deno@[a-f0-9]{40} # v2\.0\.5/u);
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toContain('--auth=');
    expect(workflow).not.toContain('custom-functions push');
  });

  it('quotes valid repository paths and includes manifest-referenced files', () => {
    const workflow = generateGithubActionsWorkflow({
      cliVersion: '10.27.4',
      targetDirectory: "packages/customer's-functions",
      manifestPath: "packages/customer's-functions/functions.yml",
      watchedPaths: ["packages/customer's-functions/src/example.ts"],
    });

    expect(() => parse(workflow)).not.toThrow();
    expect(workflow).toContain(JSON.stringify("packages/customer's-functions/src/example.ts"));
  });

  it('passes actionlint validation', () => {
    const root = mkdtempSync(join(tmpdir(), 'custom-function-workflow-'));
    const path = join(root, 'workflow.yml');
    try {
      writeFileSync(
        path,
        generateGithubActionsWorkflow({
          cliVersion: '10.27.4',
          targetDirectory: "packages/customer's-functions",
          manifestPath: "packages/customer's-functions/transcend-functions.yml",
        }),
      );

      expect(() => execFileSync('actionlint', [path], { stdio: 'pipe' })).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
