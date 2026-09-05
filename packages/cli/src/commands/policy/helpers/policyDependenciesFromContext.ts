import { spawn, spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

import fg from 'fast-glob';

import type { LocalContext } from '../../../context.js';
import { assertOpaInstalled, type AssertOpaInstalledDependencies } from './assertOpaInstalled.js';
import type { BuildOpaBundleTarballDependencies } from './buildOpaBundleTarball.js';
import type { BuildPolicyBundleFormDataDependencies } from './buildPolicyBundleFormData.js';
import { runOPACapture, type RunOpaDependencies } from './runOpa.js';

/** Policy helper dependencies derived from the CLI context. */
export interface PolicyDependencies {
  /** Dependencies used to check that OPA is installed. */
  readonly assertOpaInstalled: AssertOpaInstalledDependencies;
  /** Dependencies used to invoke OPA commands. */
  readonly runOpa: RunOpaDependencies;
  /** Dependencies used to validate and package policy bundles. */
  readonly buildOpaBundleTarball: BuildOpaBundleTarballDependencies;
  /** Dependencies used to build policy upload form data. */
  readonly buildPolicyBundleFormData: BuildPolicyBundleFormDataDependencies;
}

/**
 * Adapts the CLI context to policy helper dependency bags.
 *
 * @param context - CLI runtime dependencies
 * @returns Complete dependencies for policy helpers
 */
export function policyDependenciesFromContext(
  context: Pick<LocalContext, 'fs' | 'path' | 'os' | 'process'>,
): PolicyDependencies {
  const assertOpaInstalledDependencies: AssertOpaInstalledDependencies = {
    spawnSync,
    env: context.process.env,
  };
  const runOpaDependencies: RunOpaDependencies = {
    spawn,
    env: context.process.env,
    stdio: context.process,
  };

  return {
    assertOpaInstalled: assertOpaInstalledDependencies,
    runOpa: runOpaDependencies,
    buildOpaBundleTarball: {
      fs: context.fs,
      path: context.path,
      os: context.os,
      env: context.process.env,
      tarSpawnSync: spawnSync,
      fastGlob: fg,
      gunzipSync,
      opa: {
        assertInstalled: () => assertOpaInstalled(assertOpaInstalledDependencies),
        runCapture: (args, options) => runOPACapture(args, options, runOpaDependencies),
      },
    },
    buildPolicyBundleFormData: {
      fs: context.fs,
      path: context.path,
    },
  };
}
