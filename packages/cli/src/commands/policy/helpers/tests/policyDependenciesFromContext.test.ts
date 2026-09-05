import { describe, expect, it } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { policyDependenciesFromContext } from '../policyDependenciesFromContext.js';

describe('policyDependenciesFromContext', () => {
  it('adapts context filesystem, path, OS, environment, and process streams', () => {
    const context = buildContextForTest({
      env: {
        DEVELOPMENT_MODE_VALIDATE_ONLY: 'false',
        POLICY_TEST_ENV: 'isolated',
      },
    });

    const dependencies = policyDependenciesFromContext(context);

    expect(dependencies.runOpa.env).toBe(context.process.env);
    expect(dependencies.runOpa.stdio.stdin).toBe(context.process.stdin);
    expect(dependencies.runOpa.stdio.stdout).toBe(context.process.stdout);
    expect(dependencies.runOpa.stdio.stderr).toBe(context.process.stderr);
    expect(dependencies.assertOpaInstalled.env).toBe(context.process.env);
    expect(dependencies.buildOpaBundleTarball.fs).toBe(context.fs);
    expect(dependencies.buildOpaBundleTarball.path).toBe(context.path);
    expect(dependencies.buildOpaBundleTarball.os).toBe(context.os);
    expect(dependencies.buildOpaBundleTarball.env).toBe(context.process.env);
    expect(dependencies.buildPolicyBundleFormData.fs).toBe(context.fs);
    expect(dependencies.buildPolicyBundleFormData.path).toBe(context.path);
  });
});
