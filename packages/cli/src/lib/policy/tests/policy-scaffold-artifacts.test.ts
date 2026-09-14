import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  ACTIONS_CHECKOUT_SHA,
  generatePolicyGithubActionsWorkflow,
  POLICY_CI_WORKFLOW_PATH,
  POLICY_STARTER_REGAL_VERSION,
  SETUP_OPA_SHA,
  SETUP_REGAL_SHA,
} from '../policy-scaffold-artifacts.js';
import { POLICY_STARTER_OPA_VERSION } from '../policy-scaffold-templates.js';

describe('Policy Engine GitHub Actions workflow', () => {
  it('is pinned, least-privilege, credential-free, and validation-only', () => {
    const workflow = generatePolicyGithubActionsWorkflow({
      cliVersion: '10.27.4',
      targetDirectory: 'transcend/policy',
    });

    expect(() => parse(workflow)).not.toThrow();
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain(`actions/checkout@${ACTIONS_CHECKOUT_SHA} # v6`);
    expect(workflow).toContain(`open-policy-agent/setup-opa@${SETUP_OPA_SHA} # v2.4.0`);
    expect(workflow).toContain(`open-policy-agent/setup-regal@${SETUP_REGAL_SHA} # v2.0.0`);
    expect(workflow).toContain(`version: "${POLICY_STARTER_OPA_VERSION}"`);
    expect(workflow).toContain(`version: "${POLICY_STARTER_REGAL_VERSION}"`);
    expect(workflow).toContain('npm install --global @transcend-io/cli@10.27.4');
    expect(workflow).toContain(
      'transcend policy lint\n          "$POLICY_DIRECTORY"\n          --noInteractive\n          --json',
    );
    expect(workflow.match(/uses: [^\n]+@[a-f0-9]{40}/gu)).toHaveLength(3);
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toContain('TRANSCEND_API_KEY');
    expect(workflow).not.toContain('policy publish');
    expect(workflow).not.toContain('mise.toml');
  });

  it('limits triggers and safely quotes custom paths', () => {
    const target = "packages/customer's policies";
    const workflow = generatePolicyGithubActionsWorkflow({
      cliVersion: '10.27.4',
      targetDirectory: target,
    });
    const parsed = parse(workflow) as {
      /** Workflow triggers. */
      on: {
        /** Pull request trigger. */
        pull_request: {
          /** Watched pull request paths. */
          paths: string[];
        };
        /** Push trigger. */
        push: {
          /** Watched push paths. */
          paths: string[];
        };
      };
      /** Workflow jobs. */
      jobs: {
        /** Policy lint job. */
        lint: {
          /** Workflow steps. */
          steps: {
            /** Optional environment. */
            env?: Record<string, string>;
          }[];
        };
      };
    };
    const expectedPaths = [
      `${target}/**/*.rego`,
      `${target}/**/*.json`,
      `${target}/**/*.yaml`,
      `${target}/**/*.yml`,
      `${target}/.regal/config.yaml`,
      `${target}/.regal.yaml`,
      POLICY_CI_WORKFLOW_PATH,
    ];

    expect(parsed.on.pull_request.paths).toEqual(expectedPaths);
    expect(parsed.on.push.paths).toEqual(expectedPaths);
    expect(parsed.jobs.lint.steps.at(-1)?.env).toEqual({
      POLICY_DIRECTORY: target,
    });
    expect(workflow).toContain(JSON.stringify(target));
  });

  it('uses repository-root paths when the policy target is the root', () => {
    const workflow = generatePolicyGithubActionsWorkflow({
      cliVersion: '10.27.4',
      targetDirectory: '.',
    });

    expect(workflow).toContain('"**/*.rego"');
    expect(workflow).toContain('"**/*.json"');
    expect(workflow).toContain('"**/*.yaml"');
    expect(workflow).toContain('"**/*.yml"');
    expect(workflow).toContain('".regal/config.yaml"');
    expect(workflow).toContain('".regal.yaml"');
    expect(workflow).not.toContain('"./**/*.json"');
  });
});
