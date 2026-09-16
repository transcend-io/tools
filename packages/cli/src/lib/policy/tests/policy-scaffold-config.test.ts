import { parse } from 'jsonc-parser';
import { describe, expect, it } from 'vitest';

import {
  CONFLICTING_POLICY_VSCODE_EXTENSION,
  mergePolicyEditorExtensions,
  mergePolicyEditorSettings,
  mergePolicyEditorTasks,
  policyBundleRef,
  POLICY_VSCODE_EXTENSION,
} from '../policy-scaffold-config.js';
import { POLICY_STARTER_BUNDLE_DIRECTORY } from '../policy-scaffold-templates.js';

describe('Policy Engine VS Code setup', () => {
  it('merges authoritative OPA settings with comments and idempotence when bundles provided', () => {
    const existing = `{
  // Keep this repository-wide preference.
  "files.trimTrailingWhitespace": true,
  "opa.roots": ["\${workspaceFolder}/shared"]
}
`;

    const first = mergePolicyEditorSettings(existing, '/repo', "/repo/policies/customer's policy", [
      policyBundleRef('example'),
    ]);
    const second = mergePolicyEditorSettings(
      first.contents,
      '/repo',
      "/repo/policies/customer's policy",
      [policyBundleRef('example')],
    );

    expect(first.warnings).toEqual([]);
    expect(second).toEqual(first);
    expect(first.contents).toContain('// Keep this repository-wide preference.');
    expect(parse(first.contents)).toEqual({
      'files.trimTrailingWhitespace': true,
      'opa.roots': [
        '${workspaceFolder}/shared',
        `\${workspaceFolder}/policies/customer's policy/${POLICY_STARTER_BUNDLE_DIRECTORY}`,
      ],
      'opa.schema': "${workspaceFolder}/policies/customer's policy/schemas",
      'opa.checkOnSave': true,
      'opa.strictMode': true,
      'opa.bundleMode': true,
      'opa.formatter': 'opa-fmt-rego-v1',
      'files.associations': {
        "**/policies/customer's policy/**/.manifest": 'json',
      },
      'json.schemas': [
        {
          fileMatch: [
            `/policies/customer's policy/${POLICY_STARTER_BUNDLE_DIRECTORY}/input.json`,
            `/policies/customer's policy/${POLICY_STARTER_BUNDLE_DIRECTORY}/input.example.json`,
          ],
          url: "./policies/customer's policy/schemas/example/input.json",
        },
      ],
      '[rego]': {
        'editor.defaultFormatter': POLICY_VSCODE_EXTENSION,
        'editor.formatOnSave': true,
        'editor.insertSpaces': false,
        'editor.tabSize': 4,
      },
    });
  });

  it('omits opa.roots and json.schemas when no bundles provided (init)', () => {
    const result = mergePolicyEditorSettings(null, '/repo', '/repo/transcend/policy');
    const parsed = parse(result.contents) as Record<string, unknown>;

    expect(parsed['opa.roots']).toBeUndefined();
    expect(parsed['json.schemas']).toBeUndefined();
    expect(parsed['opa.schema']).toBe('${workspaceFolder}/transcend/policy/schemas');
    expect(parsed['opa.bundleMode']).toBe(true);
  });

  it('scopes the .manifest association to nested bundles under the workspace', () => {
    const nested = mergePolicyEditorSettings(null, '/repo', '/repo/transcend/policy', [
      policyBundleRef('example'),
    ]);
    const rooted = mergePolicyEditorSettings(null, '/repo', '/repo', [policyBundleRef('example')]);
    const customDir = mergePolicyEditorSettings(null, '/repo', '/repo/transcend/policy', [
      { root: 'permissions', bundleDir: 'my-bundle' },
    ]);

    expect(parse(nested.contents)).toMatchObject({
      'opa.roots': [`\${workspaceFolder}/transcend/policy/${POLICY_STARTER_BUNDLE_DIRECTORY}`],
      'opa.schema': '${workspaceFolder}/transcend/policy/schemas',
      'files.associations': {
        '**/transcend/policy/**/.manifest': 'json',
      },
    });
    expect(parse(rooted.contents)).toMatchObject({
      'opa.roots': [`\${workspaceFolder}/${POLICY_STARTER_BUNDLE_DIRECTORY}`],
      'opa.schema': '${workspaceFolder}/schemas',
      'files.associations': {
        '**/.manifest': 'json',
      },
    });
    expect(parse(customDir.contents)).toMatchObject({
      'opa.roots': ['${workspaceFolder}/transcend/policy/my-bundle'],
      'json.schemas': [
        {
          fileMatch: [
            '/transcend/policy/my-bundle/input.json',
            '/transcend/policy/my-bundle/input.example.json',
          ],
          url: './transcend/policy/schemas/permissions/input.json',
        },
      ],
    });
  });

  it('preserves conflicting settings and emits actionable warnings', () => {
    const existing = `{
  "opa.strictMode": false,
  "opa.bundleMode": false,
  "opa.formatter": "regal-fix",
  "[rego]": {
    "editor.formatOnSave": false,
    "editor.insertSpaces": true
  }
}
`;

    const result = mergePolicyEditorSettings(existing, '/repo', '/repo/policy');
    const parsed = parse(result.contents) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      'opa.strictMode': false,
      'opa.bundleMode': false,
      'opa.formatter': 'regal-fix',
      '[rego]': {
        'editor.formatOnSave': false,
        'editor.insertSpaces': true,
      },
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('opa.strictMode'),
        expect.stringContaining('opa.bundleMode'),
        expect.stringContaining('opa.formatter'),
        expect.stringContaining('[rego].editor.formatOnSave'),
        expect.stringContaining('[rego].editor.insertSpaces'),
      ]),
    );
  });

  it('recommends the official extension and discourages the known conflict', () => {
    const result = mergePolicyEditorExtensions(`{
  // Keep this repository extension.
  "recommendations": ["example.extension", "${CONFLICTING_POLICY_VSCODE_EXTENSION}"]
}
`);

    expect(result.warnings).toEqual([]);
    expect(result.contents).toContain('// Keep this repository extension.');
    expect(parse(result.contents)).toEqual({
      recommendations: ['example.extension', POLICY_VSCODE_EXTENSION],
      unwantedRecommendations: [CONFLICTING_POLICY_VSCODE_EXTENSION],
    });
    expect(mergePolicyEditorExtensions(result.contents)).toEqual(result);
  });

  it('adds per-bundle and aggregate lint tasks and preserves custom tasks', () => {
    const workspace = "/repo/policies/customer's policy";
    const result = mergePolicyEditorTasks(
      `{
  // Keep the repository build.
  "version": "2.0.0",
  "tasks": [{"label": "build", "type": "shell", "command": "pnpm build"}]
}
`,
      '/repo',
      workspace,
      [policyBundleRef('example')],
    );
    const parsed = parse(result.contents) as {
      /** VS Code tasks. */
      tasks: Record<string, unknown>[];
    };

    expect(result.warnings).toEqual([]);
    expect(result.contents).toContain('// Keep the repository build.');
    expect(parsed.tasks).toHaveLength(3);
    expect(parsed.tasks[1]).toMatchObject({
      label: 'policy: lint example',
      command: 'transcend',
      args: [
        'policy',
        'lint',
        `policies/customer's policy/${POLICY_STARTER_BUNDLE_DIRECTORY}`,
        '--noInteractive',
      ],
      group: { kind: 'test', isDefault: false },
    });
    expect(parsed.tasks[2]).toMatchObject({
      label: 'policy: lint',
      dependsOn: ['policy: lint example'],
      group: { kind: 'test', isDefault: true },
    });
  });

  it('skips task creation when no bundles provided (init)', () => {
    const result = mergePolicyEditorTasks(null, '/repo', '/repo/policy');
    const parsed = parse(result.contents) as Record<string, unknown>;

    expect(parsed.version).toBe('2.0.0');
    expect(parsed.tasks).toBeUndefined();
  });

  it('updates managed policy lint tasks when bundle roots grow', () => {
    const existing =
      '{"version":"2.0.0","tasks":[{"label":"policy: lint","dependsOn":["policy: lint example"],"group":{"kind":"test","isDefault":true},"problemMatcher":[]}]}\n';
    const result = mergePolicyEditorTasks(existing, '/repo', '/repo/policy', [
      policyBundleRef('example'),
      policyBundleRef('permissions'),
    ]);
    const parsed = parse(result.contents) as {
      /** VS Code tasks. */
      tasks: Record<string, unknown>[];
    };

    expect(result.warnings).toEqual([]);
    expect(parsed.tasks.find((task) => task.label === 'policy: lint')).toMatchObject({
      dependsOn: ['policy: lint example', 'policy: lint permissions'],
      dependsOrder: 'sequence',
    });
  });

  it('preserves non-managed custom tasks', () => {
    const existing = '{"version":"2.0.0","tasks":[{"label":"build","command":"pnpm build"}]}\n';
    const result = mergePolicyEditorTasks(existing, '/repo', '/repo/policy', [
      policyBundleRef('example'),
    ]);
    const parsed = parse(result.contents) as {
      /** VS Code tasks. */
      tasks: Record<string, unknown>[];
    };

    expect(parsed.tasks.some((task) => task.label === 'build')).toBe(true);
    expect(parsed.tasks.some((task) => task.label === 'policy: lint example')).toBe(true);
  });

  it('preserves malformed JSONC instead of replacing it', () => {
    const existing = '{"opa.strictMode":,}\n';
    const result = mergePolicyEditorSettings(existing, '/repo', '/repo/policy');

    expect(result.contents).toBe(existing);
    expect(result.warnings).toEqual([
      expect.stringContaining('fix its JSONC syntax or apply the patch manually'),
    ]);
  });
});
