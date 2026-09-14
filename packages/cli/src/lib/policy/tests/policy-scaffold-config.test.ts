import { parse } from 'jsonc-parser';
import { describe, expect, it } from 'vitest';

import {
  buildPolicyLintTask,
  CONFLICTING_POLICY_VSCODE_EXTENSION,
  mergePolicyEditorExtensions,
  mergePolicyEditorSettings,
  mergePolicyEditorTasks,
  POLICY_VSCODE_EXTENSION,
} from '../policy-scaffold-config.js';

describe('Policy Engine VS Code setup', () => {
  it('merges authoritative OPA settings with comments and idempotence', () => {
    const existing = `{
  // Keep this repository-wide preference.
  "files.trimTrailingWhitespace": true,
  "opa.roots": ["\${workspaceFolder}/shared"]
}
`;

    const first = mergePolicyEditorSettings(existing, '/repo', "/repo/policies/customer's policy");
    const second = mergePolicyEditorSettings(
      first.contents,
      '/repo',
      "/repo/policies/customer's policy",
    );

    expect(first.warnings).toEqual([]);
    expect(second).toEqual(first);
    expect(first.contents).toContain('// Keep this repository-wide preference.');
    expect(parse(first.contents)).toEqual({
      'files.trimTrailingWhitespace': true,
      'opa.roots': ['${workspaceFolder}/shared', "${workspaceFolder}/policies/customer's policy"],
      'opa.checkOnSave': true,
      'opa.strictMode': true,
      'opa.bundleMode': true,
      'opa.formatter': 'opa-fmt-rego-v1',
      '[rego]': {
        'editor.defaultFormatter': POLICY_VSCODE_EXTENSION,
        'editor.formatOnSave': true,
        'editor.insertSpaces': false,
        'editor.tabSize': 4,
      },
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

  it('adds a shell-safe target-scoped default lint task and preserves custom tasks', () => {
    const target = "/repo/policies/customer's policy";
    const result = mergePolicyEditorTasks(
      `{
  // Keep the repository build.
  "version": "2.0.0",
  "tasks": [{"label": "build", "type": "shell", "command": "pnpm build"}]
}
`,
      '/repo',
      target,
    );
    const parsed = parse(result.contents) as {
      /** VS Code tasks. */
      tasks: Record<string, unknown>[];
    };

    expect(result.warnings).toEqual([]);
    expect(result.contents).toContain('// Keep the repository build.');
    expect(parsed.tasks).toEqual([
      { label: 'build', type: 'shell', command: 'pnpm build' },
      buildPolicyLintTask('/repo', target),
    ]);
    expect(parsed.tasks[1]).toMatchObject({
      label: 'policy: lint',
      command: 'transcend',
      args: ['policy', 'lint', "policies/customer's policy", '--noInteractive'],
      group: { kind: 'test', isDefault: true },
    });
  });

  it('leaves a customized policy lint task untouched with a warning', () => {
    const existing =
      '{"version":"2.0.0","tasks":[{"label":"policy: lint","command":"./scripts/lint-policy"}]}\n';
    const result = mergePolicyEditorTasks(existing, '/repo', '/repo/policy');

    expect(result.contents).toBe(existing);
    expect(result.warnings).toEqual([expect.stringContaining('repository-specific customization')]);
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
