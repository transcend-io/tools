import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { validatePolicyBundleContents } from '../policy-bundle-manifest.js';
import {
  generatePolicyStarterFiles,
  POLICY_GITIGNORE_TEMPLATE,
  POLICY_INPUT_EXAMPLE_TEMPLATE,
  POLICY_INPUT_SCHEMA_TEMPLATE,
  POLICY_MANIFEST_TEMPLATE,
  POLICY_README_TEMPLATE,
  POLICY_REGAL_CONFIG_TEMPLATE,
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

  it('pins strict Rego v1 authoring to OPA 1.13.1 without weakening lint rules', () => {
    expect(POLICY_STARTER_OPA_VERSION).toBe('1.13.1');
    expect(yaml.load(POLICY_REGAL_CONFIG_TEMPLATE)).toEqual({
      capabilities: {
        from: {
          engine: 'opa',
          version: 'v1.13.1',
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
      manifest: { roots: [POLICY_STARTER_ROOT] },
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
    expect(POLICY_README_TEMPLATE).toContain('disposable');
    expect(POLICY_README_TEMPLATE).toContain(
      `transcend policy lint transcend/policy/${POLICY_STARTER_BUNDLE_DIRECTORY}`,
    );
    expect(POLICY_README_TEMPLATE).not.toContain('mise.toml');
  });
});
