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
import {
  POLICY_STARTER_BUNDLE_DIRECTORY,
  POLICY_STARTER_OPA_VERSION,
} from '../policy-scaffold-templates.js';

describe('Policy Engine GitHub Actions workflow', () => {
  it('emits a placeholder check job when the workspace has no bundles yet', () => {
    const workflow = generatePolicyGithubActionsWorkflow({
      cliVersion: '11.0.0',
      workspaceDirectory: 'transcend/policy',
      bundleDirectories: [],
    });

    expect(workflow).toContain('No publishable bundles yet');
    expect(workflow).not.toContain('POLICY_DIRECTORY');
    expect(workflow).toContain('transcend/policy/**/.manifest');
  });

  it('is pinned, least-privilege, credential-free, and validation-only', () => {
    const workflow = generatePolicyGithubActionsWorkflow({
      cliVersion: '10.27.4',
      workspaceDirectory: 'transcend/policy',
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
      'transcend policy check\n          "$POLICY_DIRECTORY"\n          --noInteractive\n          --json',
    );
    expect(workflow).toContain(
      `POLICY_DIRECTORY: "transcend/policy/${POLICY_STARTER_BUNDLE_DIRECTORY}"`,
    );
    expect(workflow.match(/uses: [^\n]+@[a-f0-9]{40}/gu)).toHaveLength(3);
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toContain('TRANSCEND_API_KEY');
    expect(workflow).not.toContain('policy publish');
    expect(workflow).not.toContain('mise.toml');
  });

  it('limits triggers and safely quotes custom paths', () => {
    const workspace = "packages/customer's policies";
    const workflow = generatePolicyGithubActionsWorkflow({
      cliVersion: '10.27.4',
      workspaceDirectory: workspace,
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
          /** Branches that trigger on push (avoids duplicate PR runs). */
          branches: string[];
          /** Watched push paths. */
          paths: string[];
        };
      };
      /** Workflow jobs. */
      jobs: {
        /** Policy check job. */
        check: {
          /** Workflow steps. */
          steps: {
            /** Optional environment. */
            env?: Record<string, string>;
          }[];
        };
      };
    };
    const expectedPaths = [
      `${workspace}/**/*.rego`,
      `${workspace}/**/*.json`,
      `${workspace}/**/*.yaml`,
      `${workspace}/**/*.yml`,
      `${workspace}/**/.manifest`,
      `${workspace}/.regal/config.yaml`,
      `${workspace}/.regal.yaml`,
      POLICY_CI_WORKFLOW_PATH,
    ];

    expect(parsed.on.pull_request.paths).toEqual(expectedPaths);
    expect(parsed.on.push.branches).toEqual(['main']);
    expect(parsed.on.push.paths).toEqual(expectedPaths);
    expect(parsed.jobs.check.steps.at(-1)?.env).toEqual({
      POLICY_DIRECTORY: `${workspace}/${POLICY_STARTER_BUNDLE_DIRECTORY}`,
    });
    expect(workflow).toContain(JSON.stringify(`${workspace}/**/*.rego`));
  });

  it('uses repository-root paths when the policy workspace is the root', () => {
    const workflow = generatePolicyGithubActionsWorkflow({
      cliVersion: '10.27.4',
      workspaceDirectory: '.',
    });

    expect(workflow).toContain('"**/*.rego"');
    expect(workflow).toContain('"**/*.json"');
    expect(workflow).toContain('"**/*.yaml"');
    expect(workflow).toContain('"**/*.yml"');
    expect(workflow).toContain('"**/.manifest"');
    expect(workflow).toContain('".regal/config.yaml"');
    expect(workflow).toContain('".regal.yaml"');
    expect(workflow).toContain(`POLICY_DIRECTORY: "${POLICY_STARTER_BUNDLE_DIRECTORY}"`);
    expect(workflow).not.toContain('"./**/*.json"');
  });

  it('matrices check across multiple publish directories when provided', () => {
    const workflow = generatePolicyGithubActionsWorkflow({
      cliVersion: '11.0.0',
      workspaceDirectory: 'transcend/policy',
      bundleDirectories: ['transcend/policy/example-bundle', 'transcend/policy/permissions-bundle'],
    });
    const parsed = parse(workflow) as {
      /** Workflow jobs. */
      jobs: {
        /** Policy check job. */
        check: {
          /** Matrix strategy. */
          strategy: {
            /** Matrix values. */
            matrix: {
              /** Publish directories. */
              policy_directory: string[];
            };
          };
        };
      };
    };

    expect(parsed.jobs.check.strategy.matrix.policy_directory).toEqual([
      'transcend/policy/example-bundle',
      'transcend/policy/permissions-bundle',
    ]);
    expect(workflow).toContain('${{ matrix.policy_directory }}');
  });
});
