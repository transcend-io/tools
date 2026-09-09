import { describe, expect, it } from 'vitest';

import {
  parsePolicyBundleManifest,
  validatePolicyBundleContents,
} from '../policy-bundle-manifest.js';
import { parseRegoPackageReference } from '../rego-reference.js';

describe('policy bundle manifest contract', () => {
  it('accepts nested packages and excludes local tests from publishable files', () => {
    expect(
      validatePolicyBundleContents('{"roots":["policy_engine"]}', [
        {
          path: 'policy_engine/example/result.rego',
          contents: 'package policy_engine.example\n',
        },
        {
          path: 'policy_engine/example/result_test.rego',
          contents: 'package policy_engine.example_test\n',
        },
      ]),
    ).toEqual({
      manifest: { roots: ['policy_engine'] },
      publishableRegoPaths: ['policy_engine/example/result.rego'],
    });
  });

  it.each([
    [undefined, /must contain a manifest\.json/u],
    ['{ invalid', /manifest\.json is not valid JSON/u],
    ['[]', /must contain a JSON object/u],
    ['{}', /must declare "roots" as a non-empty array/u],
    ['{"roots":[]}', /must declare "roots" as a non-empty array/u],
    ['{"roots":["policy_engine",42]}', /must be an array of non-empty strings/u],
    ['{"roots":["policy_engine/customer.policy"]}', /slash-separated Rego identifiers/u],
  ])('rejects an invalid manifest contract', (contents, message) => {
    expect(() => parsePolicyBundleManifest(contents)).toThrow(message);
  });

  it('rejects projects without publishable Rego', () => {
    expect(() =>
      validatePolicyBundleContents('{"roots":["policy_engine"]}', [
        {
          path: 'policy_engine/result_test.rego',
          contents: 'package policy_engine_test\n',
        },
      ]),
    ).toThrow(/at least one \.rego policy file/u);
  });

  it('reports every publishable package outside the declared roots', () => {
    expect(() =>
      validatePolicyBundleContents('{"roots":["policy_engine"]}', [
        { path: 'first.rego', contents: 'package other.first\n' },
        { path: 'second.rego', contents: 'package other.second\n' },
        { path: 'ignored_test.rego', contents: 'package tests.outside\n' },
      ]),
    ).toThrow(
      /roots" do not cover all Rego packages[\s\S]*first\.rego \(package other\.first\)[\s\S]*second\.rego \(package other\.second\)/u,
    );
  });

  it('compares manifest roots with quoted package segments', () => {
    const contents = 'package policy_engine["customer.policy"].result\n';

    expect(parseRegoPackageReference(contents)).toEqual({
      source: 'policy_engine["customer.policy"].result',
      segments: ['policy_engine', 'customer.policy', 'result'],
    });
    expect(parseRegoPackageReference('package policy_engine[`customer.policy`].result\n')).toEqual({
      source: 'policy_engine[`customer.policy`].result',
      segments: ['policy_engine', 'customer.policy', 'result'],
    });
    expect(() =>
      validatePolicyBundleContents('{"roots":["policy_engine"]}', [
        { path: 'result.rego', contents },
      ]),
    ).not.toThrow();
    expect(() =>
      validatePolicyBundleContents('{"roots":["policy_engine/customer"]}', [
        { path: 'result.rego', contents },
      ]),
    ).toThrow(/not covered by roots/u);
  });

  it('rejects direct self-root references from publishable policy', () => {
    expect(() =>
      validatePolicyBundleContents('{"roots":["policy_engine"]}', [
        {
          path: 'result.rego',
          contents: 'package policy_engine.result\n\nallow if data.policy_engine.helper.allowed\n',
        },
      ]),
    ).toThrow(
      /result\.rego:3 references data\.policy_engine\.helper\.allowed; import that package/u,
    );
  });

  it('allows imports, strings, comments, and local test references to bundle roots', () => {
    expect(() =>
      validatePolicyBundleContents('{"roots":["policy_engine"]}', [
        {
          path: 'result.rego',
          contents: [
            'package policy_engine.result',
            'import data.policy_engine.helper',
            'description := "data.policy_engine.helper.allowed"',
            '# data.policy_engine.helper.allowed',
            'allow if helper.allowed',
          ].join('\n'),
        },
        {
          path: 'result_test.rego',
          contents:
            'package policy_engine.result_test\n\ntest_allow if data.policy_engine.result.allow\n',
        },
      ]),
    ).not.toThrow();
  });
});
