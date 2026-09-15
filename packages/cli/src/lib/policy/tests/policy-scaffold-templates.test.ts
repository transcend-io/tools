import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { validatePolicyBundleContents } from '../policy-bundle-manifest.js';
import {
  generatePolicyStarterFiles,
  generatePolicyWorkspaceFiles,
  generatePolicyBundleFiles,
  mergePolicyRegalConfigRoots,
  POLICY_GITIGNORE_TEMPLATE,
  POLICY_INPUT_EXAMPLE_TEMPLATE,
  POLICY_INPUT_SCHEMA_TEMPLATE,
  POLICY_MANIFEST_TEMPLATE,
  POLICY_README_TEMPLATE,
  POLICY_REGAL_CONFIG_TEMPLATE,
  POLICY_REGAL_CONFIG_EMPTY_TEMPLATE,
  POLICY_RESULT_REGO_TEMPLATE,
  POLICY_RESULT_TEST_REGO_TEMPLATE,
  POLICY_STARTER_BUNDLE_DIRECTORY,
  POLICY_STARTER_OPA_VERSION,
  POLICY_STARTER_RESULT_REGO_PATH,
  POLICY_STARTER_RESULT_TEST_REGO_PATH,
  POLICY_STARTER_ROOT,
} from '../policy-scaffold-templates.js';

describe('policy starter templates', () => {
  it('generates the complete deterministic starter with trailing newlines', () => {
    const first = generatePolicyStarterFiles();
    const second = generatePolicyStarterFiles();

    expect(second).toEqual(first);
    expect(first.map(({ path }) => path)).toEqual([
      `${POLICY_STARTER_BUNDLE_DIRECTORY}/.manifest`,
      '.regal/config.yaml',
      `schemas/${POLICY_STARTER_ROOT}/input.json`,
      POLICY_STARTER_RESULT_REGO_PATH,
      POLICY_STARTER_RESULT_TEST_REGO_PATH,
      `${POLICY_STARTER_BUNDLE_DIRECTORY}/input.example.json`,
      `${POLICY_STARTER_BUNDLE_DIRECTORY}/.gitignore`,
      'README.md',
    ]);
    expect(first.every(({ path }) => !path.startsWith('/'))).toBe(true);
    expect(first.every(({ contents }) => contents.endsWith('\n'))).toBe(true);
  });

  it('pins strict Rego v1 authoring to OPA 1.18.2 without weakening lint rules', () => {
    expect(POLICY_STARTER_OPA_VERSION).toBe('1.18.2');
    expect(yaml.load(POLICY_REGAL_CONFIG_TEMPLATE)).toEqual({
      capabilities: {
        from: {
          engine: 'opa',
          version: 'v1.18.2',
        },
      },
      project: {
        roots: [POLICY_STARTER_ROOT],
        'rego-version': 1,
      },
    });
    expect(POLICY_REGAL_CONFIG_TEMPLATE).not.toContain('rules:');
    expect(POLICY_REGAL_CONFIG_TEMPLATE).not.toContain('ignore:');
    expect(POLICY_REGAL_CONFIG_TEMPLATE).not.toContain('runtime');
  });

  it('creates a publishable document tree covered by the manifest root', () => {
    expect(JSON.parse(POLICY_MANIFEST_TEMPLATE)).toEqual({
      $schema: 'https://openpolicyagent.org/schemas/bundle/v1/manifest.schema.json',
      revision: '',
      roots: [POLICY_STARTER_ROOT],
      rego_version: 1,
      metadata: {
        'transcend.io': {
          template: 'generic',
        },
      },
    });
    expect(
      validatePolicyBundleContents(POLICY_MANIFEST_TEMPLATE, [
        {
          path: `${POLICY_STARTER_ROOT}/result/result.rego`,
          contents: POLICY_RESULT_REGO_TEMPLATE,
        },
        {
          path: `${POLICY_STARTER_ROOT}/result/result_test.rego`,
          contents: POLICY_RESULT_TEST_REGO_TEMPLATE,
        },
      ]),
    ).toEqual({
      manifest: { roots: [POLICY_STARTER_ROOT], template: 'generic' },
      publishableRegoPaths: [`${POLICY_STARTER_ROOT}/result/result.rego`],
    });
  });

  it('documents a fail-closed extensible result without product-specific runtime structure', () => {
    expect(POLICY_RESULT_REGO_TEMPLATE).toContain('import rego.v1');
    expect(POLICY_RESULT_REGO_TEMPLATE).toContain('# entrypoint: true');
    expect(POLICY_RESULT_REGO_TEMPLATE).toContain(`schema.${POLICY_STARTER_ROOT}.input`);
    expect(POLICY_RESULT_REGO_TEMPLATE).toContain('default decision := "deny"');
    expect(POLICY_RESULT_REGO_TEMPLATE).toContain('default reason_code :=');
    expect(POLICY_RESULT_REGO_TEMPLATE).not.toContain('myelin');
    expect(POLICY_RESULT_REGO_TEMPLATE).not.toContain('runtime');
    expect(POLICY_RESULT_TEST_REGO_TEMPLATE).toContain(
      `package ${POLICY_STARTER_ROOT}.result_test`,
    );
    expect(POLICY_RESULT_TEST_REGO_TEMPLATE.match(/^test_/gmu)).toHaveLength(3);
    expect(JSON.parse(POLICY_INPUT_SCHEMA_TEMPLATE).$id).toContain(
      `/policy-schemas/${POLICY_STARTER_ROOT}/input.json`,
    );
  });

  it('keeps local input sanitized and ignores only the private root input', () => {
    expect(JSON.parse(POLICY_INPUT_EXAMPLE_TEMPLATE)).toEqual({
      subject: { trusted: false },
    });
    expect(POLICY_INPUT_EXAMPLE_TEMPLATE).not.toMatch(/email|name|token|secret/iu);
    expect(POLICY_GITIGNORE_TEMPLATE).toContain('/input.json');
    expect(POLICY_README_TEMPLATE).toContain('policy new');
    expect(POLICY_README_TEMPLATE).not.toContain('mise.toml');
  });
});

describe('policy workspace init files', () => {
  it('generates only regal config and readme', () => {
    const files = generatePolicyWorkspaceFiles();

    expect(files.map(({ path }) => path)).toEqual(['.regal/config.yaml', 'README.md']);
    expect(files.every(({ contents }) => contents.endsWith('\n'))).toBe(true);
  });

  it('creates regal config with empty project roots', () => {
    expect(yaml.load(POLICY_REGAL_CONFIG_EMPTY_TEMPLATE)).toEqual({
      capabilities: {
        from: {
          engine: 'opa',
          version: 'v1.18.2',
        },
      },
      project: {
        roots: [],
        'rego-version': 1,
      },
    });
  });

  it('merges a root into Regal config without wiping custom keys', () => {
    const existing = `capabilities:
  from:
    engine: opa
    version: v1.18.2
project:
  roots:
    - example
  rego-version: 1
rules:
  idiomatic/custom-has-key:
    level: ignore
ignore:
  files:
    - "**/vendor/**"
`;

    const { contents, roots } = mergePolicyRegalConfigRoots(existing, 'permissions');
    const parsed = yaml.load(contents) as Record<string, unknown>;

    expect(roots).toEqual(['example', 'permissions']);
    expect(parsed).toMatchObject({
      capabilities: {
        from: {
          engine: 'opa',
          version: 'v1.18.2',
        },
      },
      project: {
        roots: ['example', 'permissions'],
        'rego-version': 1,
      },
      rules: {
        'idiomatic/custom-has-key': {
          level: 'ignore',
        },
      },
      ignore: {
        files: ['**/vendor/**'],
      },
    });
  });

  it('throws when project.roots is not an array of strings', () => {
    const existing = `project:
  roots: example
`;
    expect(() => mergePolicyRegalConfigRoots(existing, 'permissions')).toThrow(
      /project\.roots must be an array of strings/,
    );
  });
});

describe('policy bundle templates', () => {
  it('generates a generic bundle with parameterized root', () => {
    const files = generatePolicyBundleFiles('generic', 'myapp');

    expect(files.map(({ path }) => path)).toEqual([
      'myapp-bundle/.manifest',
      'schemas/myapp/input.json',
      'myapp-bundle/myapp/result/result.rego',
      'myapp-bundle/myapp/result/result_test.rego',
      'myapp-bundle/input.example.json',
      'myapp-bundle/input.json',
      'myapp-bundle/.gitignore',
    ]);
    expect(files.every(({ contents }) => contents.endsWith('\n'))).toBe(true);
    expect(JSON.parse(files[0]!.contents).roots).toEqual(['myapp']);
    expect(JSON.parse(files[0]!.contents).metadata).toEqual({
      'transcend.io': { template: 'generic' },
    });
    expect(files[2]!.contents).toContain('package myapp.result');
    expect(files[3]!.contents).toContain('package myapp.result_test');
    expect(files.find(({ path }) => path === 'myapp-bundle/input.json')?.contents).toBe(
      files.find(({ path }) => path === 'myapp-bundle/input.example.json')?.contents,
    );
  });

  it('generates a permissions bundle with all expected files', () => {
    const files = generatePolicyBundleFiles('permissions', 'permissions');

    const paths = files.map(({ path }) => path);
    expect(paths).toContain('permissions-bundle/.manifest');
    expect(paths).toContain('schemas/permissions/input.json');
    expect(paths).toContain('permissions-bundle/permissions/config/config.rego');
    expect(paths).toContain('permissions-bundle/permissions/config/data.json');
    expect(paths).toContain('permissions-bundle/permissions/helpers/preference/preference.rego');
    expect(paths).toContain(
      'permissions-bundle/permissions/helpers/preference/preference_test.rego',
    );
    expect(paths).toContain('permissions-bundle/permissions/main.rego');
    expect(paths).toContain('permissions-bundle/permissions/purposes/analytics/analytics.rego');
    expect(paths).toContain(
      'permissions-bundle/permissions/purposes/analytics/analytics_test.rego',
    );
    expect(paths).toContain('permissions-bundle/permissions/purposes/entrypoint.rego');
    expect(paths).toContain('permissions-bundle/input.example.json');
    expect(paths).toContain('permissions-bundle/input.json');
    expect(paths).toContain('permissions-bundle/.gitignore');
    expect(files.every(({ contents }) => contents.endsWith('\n'))).toBe(true);
    expect(
      JSON.parse(files.find(({ path }) => path.endsWith('.manifest'))!.contents).metadata,
    ).toEqual({
      'transcend.io': { template: 'permissions' },
    });
    expect(files.find(({ path }) => path === 'permissions-bundle/input.json')?.contents).toBe(
      files.find(({ path }) => path === 'permissions-bundle/input.example.json')?.contents,
    );
  });

  it('parameterizes the permissions bundle root correctly', () => {
    const files = generatePolicyBundleFiles('permissions', 'consent');

    const mainRego = files.find(({ path }) => path.endsWith('main.rego'));
    expect(mainRego?.contents).toContain('package consent');
    expect(mainRego?.path).toContain('consent-bundle/consent/main.rego');
    expect(
      JSON.parse(files.find(({ path }) => path.endsWith('.manifest'))!.contents).metadata,
    ).toEqual({
      'transcend.io': { template: 'permissions' },
    });

    const prefRego = files.find(
      ({ path }) => path.includes('preference.rego') && !path.includes('_test'),
    );
    expect(prefRego?.contents).toContain('package consent.helpers.preference');
    expect(prefRego?.contents).toContain('import data.consent.config');
  });
});
