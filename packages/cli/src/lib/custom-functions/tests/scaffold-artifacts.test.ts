import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { RECOMMENDED_DENO_VERSION } from '../deno-runtime.js';
import {
  generateGithubActionsWorkflow,
  isUnmodifiedCustomFunctionWorkflow,
} from '../scaffold-artifacts.js';

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
    expect(workflow).toContain(`deno-version: ${RECOMMENDED_DENO_VERSION}`);
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toContain('--auth=');
    expect(workflow).not.toContain('custom-functions push');
    expect(isUnmodifiedCustomFunctionWorkflow(workflow)).toBe(true);
    expect(isUnmodifiedCustomFunctionWorkflow(workflow.replace('--json', '--fix'))).toBe(false);
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

  it('escapes literal GitHub glob characters in repository paths', () => {
    const workflow = generateGithubActionsWorkflow({
      cliVersion: '10.27.4',
      targetDirectory: 'packages/[tenant]/custom-functions',
      manifestPath: 'packages/[tenant]/custom-functions/functions!.yml',
      watchedPaths: ['packages/[tenant]/custom-functions/src/file?.ts'],
    });

    expect(workflow).toContain(
      JSON.stringify(String.raw`packages/\[tenant\]/custom-functions/functions\!.yml`),
    );
    expect(workflow).toContain(
      JSON.stringify(String.raw`packages/\[tenant\]/custom-functions/src/file\?.ts`),
    );
  });
});
