import { describe, expect, it } from 'vitest';

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
});
