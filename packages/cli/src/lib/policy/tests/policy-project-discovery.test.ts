import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildContextForTest } from '../../tests/helpers/buildContextForTest.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  discoverPolicyProject,
} from '../policy-project-discovery.js';

const temporaryRoots: string[] = [];

/**
 * Create and register an isolated temporary directory.
 *
 * @returns Temporary directory
 */
function makeTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'policy-discovery-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe('discoverPolicyProject', () => {
  it('uses the invocation root for repository setup around the bare default project', () => {
    const root = makeTemporaryRoot();

    const state = discoverPolicyProject(
      buildContextForTest({ cwd: root }),
      DEFAULT_POLICY_PROJECT_DIRECTORY,
    );

    expect(state.targetDirectory).toBe(join(root, 'transcend', 'policy'));
    expect(state.projectRoot).toBe(root);
    expect(state.repositoryRoot).toBeUndefined();
  });

  it('uses the invocation root for a custom standalone target', () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'custom-policy');

    const state = discoverPolicyProject(buildContextForTest({ cwd: root }), target);

    expect(state.targetDirectory).toBe(target);
    expect(state.projectRoot).toBe(root);
    expect(state.repositoryRoot).toBeUndefined();
  });
});
