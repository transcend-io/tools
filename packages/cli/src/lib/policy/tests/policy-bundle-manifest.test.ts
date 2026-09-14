import { describe, expect, it } from 'vitest';

import {
  parsePolicyBundleManifest,
  validatePolicyBundleContents,
} from '../policy-bundle-manifest.js';
import {
  POLICY_ENGINE_ROOT,
  POLICY_STARTER_EXAMPLE_DIRECTORY,
} from '../policy-scaffold-templates.js';
import { parseRegoPackageReference } from '../rego-reference.js';

describe('policy bundle manifest contract', () => {
  it('accepts nested packages and excludes local tests from publishable files', () => {
    expect(
      validatePolicyBundleContents(JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }), [
        {
          path: `${POLICY_STARTER_EXAMPLE_DIRECTORY}/result.rego`,
          contents: `package ${POLICY_ENGINE_ROOT}.example\n`,
        },
        {
          path: `${POLICY_STARTER_EXAMPLE_DIRECTORY}/result_test.rego`,
          contents: `package ${POLICY_ENGINE_ROOT}.example_test\n`,
        },
      ]),
    ).toEqual({
      manifest: { roots: [POLICY_ENGINE_ROOT] },
      publishableRegoPaths: [`${POLICY_STARTER_EXAMPLE_DIRECTORY}/result.rego`],
    });
  });

  it.each([
    [undefined, /\.manifest/u],
    ['{ invalid', /\.manifest is not valid JSON/u],
    ['[]', /must contain a JSON object/u],
    ['{}', /must declare "roots" as a non-empty array/u],
    ['{"roots":[]}', /must declare "roots" as a non-empty array/u],
    [JSON.stringify({ roots: [POLICY_ENGINE_ROOT, 42] }), /must be an array of non-empty strings/u],
    ['{"roots":[""]}', /must be an array of non-empty strings/u],
    [
      JSON.stringify({ roots: [`${POLICY_ENGINE_ROOT}/customer.policy`] }),
      /slash-separated Rego identifiers/u,
    ],
  ])('rejects an invalid manifest contract', (contents, message) => {
    expect(() => parsePolicyBundleManifest(contents)).toThrow(message);
  });

  it('rejects projects without publishable Rego', () => {
    expect(() =>
      validatePolicyBundleContents(JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }), [
        {
          path: `${POLICY_ENGINE_ROOT}/result_test.rego`,
          contents: `package ${POLICY_ENGINE_ROOT}_test\n`,
        },
      ]),
    ).toThrow(/at least one \.rego policy file/u);
  });

  it('reports every publishable package outside the declared roots', () => {
    expect(() =>
      validatePolicyBundleContents(JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }), [
        { path: 'first.rego', contents: 'package other.first\n' },
        { path: 'second.rego', contents: 'package other.second\n' },
        { path: 'ignored_test.rego', contents: 'package tests.outside\n' },
      ]),
    ).toThrow(
      /roots" do not cover all Rego packages[\s\S]*first\.rego \(package other\.first\)[\s\S]*second\.rego \(package other\.second\)/u,
    );
  });

  it('compares manifest roots with quoted package segments', () => {
    const contents = `package ${POLICY_ENGINE_ROOT}["customer.policy"].result\n`;

    expect(parseRegoPackageReference(contents)).toEqual({
      source: `${POLICY_ENGINE_ROOT}["customer.policy"].result`,
      segments: [POLICY_ENGINE_ROOT, 'customer.policy', 'result'],
    });
    expect(
      parseRegoPackageReference(`package ${POLICY_ENGINE_ROOT}[\`customer.policy\`].result\n`),
    ).toEqual({
      source: `${POLICY_ENGINE_ROOT}[\`customer.policy\`].result`,
      segments: [POLICY_ENGINE_ROOT, 'customer.policy', 'result'],
    });
    expect(() =>
      validatePolicyBundleContents(JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }), [
        { path: `${POLICY_ENGINE_ROOT}/result.rego`, contents },
      ]),
    ).not.toThrow();
    expect(() =>
      validatePolicyBundleContents(JSON.stringify({ roots: [`${POLICY_ENGINE_ROOT}/customer`] }), [
        { path: `${POLICY_ENGINE_ROOT}/result.rego`, contents },
      ]),
    ).toThrow(/not covered by roots/u);
  });

  it('rejects direct self-root references from publishable policy', () => {
    expect(() =>
      validatePolicyBundleContents(JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }), [
        {
          path: `${POLICY_ENGINE_ROOT}/result.rego`,
          contents: `package ${POLICY_ENGINE_ROOT}.result\n\nallow if data.${POLICY_ENGINE_ROOT}.helper.allowed\n`,
        },
      ]),
    ).toThrow(
      new RegExp(
        `${POLICY_ENGINE_ROOT}/result\\.rego:3 references data\\.${POLICY_ENGINE_ROOT}\\.helper\\.allowed; import that package`,
        'u',
      ),
    );
  });

  it('allows imports, strings, comments, and local test references to bundle roots', () => {
    expect(() =>
      validatePolicyBundleContents(JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }), [
        {
          path: `${POLICY_ENGINE_ROOT}/result.rego`,
          contents: [
            `package ${POLICY_ENGINE_ROOT}.result`,
            `import data.${POLICY_ENGINE_ROOT}.helper`,
            `description := "data.${POLICY_ENGINE_ROOT}.helper.allowed"`,
            `# data.${POLICY_ENGINE_ROOT}.helper.allowed`,
            'allow if helper.allowed',
          ].join('\n'),
        },
        {
          path: `${POLICY_ENGINE_ROOT}/result_test.rego`,
          contents: `package ${POLICY_ENGINE_ROOT}.result_test\n\ntest_allow if data.${POLICY_ENGINE_ROOT}.result.allow\n`,
        },
      ]),
    ).not.toThrow();
  });
});
