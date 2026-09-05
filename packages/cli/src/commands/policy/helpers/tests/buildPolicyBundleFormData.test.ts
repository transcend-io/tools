import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  buildPolicyBundleFormData,
  type BuildPolicyBundleFormDataDependencies,
} from '../buildPolicyBundleFormData.js';

describe('buildPolicyBundleFormData', () => {
  it('reads and names the bundle through explicit dependencies', () => {
    const readFileSync = vi.fn(() => Buffer.from('bundle'));
    const basename = vi.fn(() => 'policy-bundle.tar.gz');
    const dependencies: BuildPolicyBundleFormDataDependencies = {
      fs: {
        readFileSync: readFileSync as unknown as typeof fs.readFileSync,
      },
      path: {
        basename: basename as typeof path.basename,
      },
    };

    const form = buildPolicyBundleFormData(
      {
        bundlePath: '/isolated/policy-bundle.tar.gz',
        version: 'v1',
        description: 'First version',
        bundleName: 'main',
      },
      dependencies,
    );

    expect(readFileSync).toHaveBeenCalledWith('/isolated/policy-bundle.tar.gz');
    expect(basename).toHaveBeenCalledWith('/isolated/policy-bundle.tar.gz');
    expect(form.get('version')).toBe('v1');
    expect(form.get('description')).toBe('First version');
    expect(form.get('bundleName')).toBe('main');
    expect(form.get('bundle')).toBeInstanceOf(File);
  });
});
