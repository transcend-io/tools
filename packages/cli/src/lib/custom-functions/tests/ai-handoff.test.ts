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

    expect(handoff).toContain('install Deno 2');
    expect(handoff).toContain('@transcend-io/cli@10.27.4');
    expect(handoff).toContain('--noInteractive');
  });
});

describe('buildNewFunctionAiHandoff', () => {
  it('routes implementation through the installed authoring skill', () => {
    const handoff = buildNewFunctionAiHandoff({
      displayName: 'Customer CRM access',
      sourcePath: 'transcend/custom-functions/functions/customer-crm-access.ts',
      targetDirectory: 'transcend/custom-functions',
      manifestPath: 'transcend/custom-functions/transcend-functions.yml',
      hasSkill: true,
      variableNames: ['TRANSCEND_API_KEY'],
    });

    expect(handoff).toContain('Use the `transcend-custom-functions` skill');
    expect(handoff).toContain('transcend custom-functions run');
    expect(handoff).toContain("--function='Customer CRM access'");
    expect(handoff).toContain("--variables='TRANSCEND_API_KEY:placeholder'");
  });

  it('preserves a custom manifest path in the validation command', () => {
    const handoff = buildNewFunctionAiHandoff({
      displayName: 'Customer CRM access',
      sourcePath: 'functions/customer-crm-access.ts',
      targetDirectory: '.',
      manifestPath: 'functions.yml',
      hasSkill: false,
      variableNames: [],
    });

    expect(handoff).toContain("--manifest='functions.yml'");
  });
});
