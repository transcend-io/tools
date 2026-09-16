import { describe, expect, it } from 'vitest';

import { formatPolicyPublishBundleNameHint } from '../policy-publish-hints.js';

describe('formatPolicyPublishBundleNameHint', () => {
  it('warns when a permissions template is published under another name', () => {
    expect(
      formatPolicyPublishBundleNameHint('example', {
        template: 'permissions',
        roots: ['consent'],
      }),
    ).toMatch(/--bundle-name=permissions/);
  });

  it('warns when the reserved permissions name is used for a generic template', () => {
    expect(
      formatPolicyPublishBundleNameHint('permissions', {
        template: 'generic',
        roots: ['example'],
      }),
    ).toMatch(/reserves the Permissions API/);
  });

  it('falls back to roots when template metadata is absent', () => {
    expect(
      formatPolicyPublishBundleNameHint('main', {
        roots: ['permissions'],
      }),
    ).toMatch(/looks like a Permissions API policy/);
  });

  it('returns undefined when remote name matches local intent', () => {
    expect(
      formatPolicyPublishBundleNameHint('permissions', {
        template: 'permissions',
        roots: ['permissions'],
      }),
    ).toBeUndefined();
    expect(
      formatPolicyPublishBundleNameHint('example', {
        template: 'generic',
        roots: ['example'],
      }),
    ).toBeUndefined();
  });
});
