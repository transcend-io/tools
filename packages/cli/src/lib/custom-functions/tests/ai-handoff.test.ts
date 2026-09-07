import { describe, expect, it } from 'vitest';

import { buildInitAiHandoff, buildNewFunctionAiHandoff } from '../ai-handoff.js';

describe('buildInitAiHandoff', () => {
  const baseOptions = {
    targetDirectory: 'transcend/custom-functions',
    manifestPath: 'transcend/custom-functions/transcend-functions.yml',
    cliVersion: '10.27.4',
    hasSkill: true,
  };

  it('points an agent at the generated GitHub workflow', () => {
    expect(buildInitAiHandoff({ ...baseOptions, hasGithubWorkflow: true })).toContain(
      'adapt the generated GitHub Actions workflow',
    );
  });

  it('gives other CI systems the complete validation recipe', () => {
    const handoff = buildInitAiHandoff({ ...baseOptions, hasGithubWorkflow: false });

    expect(handoff).toContain('install Deno 2.x');
    expect(handoff).toContain('@transcend-io/cli@10.27.4');
    expect(handoff).toContain('--noInteractive');
  });
});

describe('buildNewFunctionAiHandoff', () => {
  it('routes implementation through the installed authoring skill', () => {
    expect(
      buildNewFunctionAiHandoff({
        displayName: 'Customer CRM access',
        sourcePath: 'transcend/custom-functions/functions/customer-crm-access.ts',
        targetDirectory: 'transcend/custom-functions',
        hasSkill: true,
      }),
    ).toContain('Use the `transcend-custom-functions` skill');
  });
});
