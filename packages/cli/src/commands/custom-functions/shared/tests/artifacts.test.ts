import { describe, expect, it } from 'vitest';

import { generateGithubActionsWorkflow } from '../artifacts.js';

describe('generateGithubActionsWorkflow', () => {
  it('generates pinned, least-privilege checks with a trusted-branch deploy gate', () => {
    const workflow = generateGithubActionsWorkflow({
      cliVersion: '10.27.4',
      targetDirectory: 'packages/custom-functions',
      manifestPath: 'packages/custom-functions/transcend-functions.yml',
    });

    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toMatch(/uses: actions\/checkout@[a-f0-9]{40} # v6/u);
    expect(workflow).toMatch(/uses: denoland\/setup-deno@[a-f0-9]{40} # v2\.0\.5/u);
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).toContain("github.event_name == 'push'");
    expect(workflow).toContain('github.ref_name == github.event.repository.default_branch');
    expect(workflow).toContain("vars.TRANSCEND_CUSTOM_FUNCTIONS_DEPLOY == 'true'");
    expect(workflow).toContain('TRANSCEND_API_KEY: ${{ secrets.TRANSCEND_API_KEY }}');

    const validateStep = workflow.slice(
      workflow.indexOf('- name: Validate Custom Functions'),
      workflow.indexOf('- name: Deploy from the trusted default branch'),
    );
    expect(validateStep).not.toContain('secrets.');
    expect(validateStep).not.toContain('--auth=');
  });
});
