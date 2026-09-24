import type { LocalContext } from '../../../context.js';
import type { CapturedProcessRunner } from '../../../lib/cli/run-captured-process.js';
import { getPolicyProcessFailureMessage } from '../../../lib/policy/policy-process-output.js';
import {
  OPA_MISSING_MESSAGE,
  parsePolicyToolVersion,
  REGAL_MISSING_MESSAGE,
  unsupportedOpaVersionMessage,
  unsupportedRegalVersionMessage,
} from '../../../lib/policy/policy-runtime.js';

/** Outcome of probing local OPA and Regal versions. */
export interface ProbePolicyToolVersionsResult {
  /** Detected OPA version, or null when missing or unsupported. */
  opa: string | null;
  /** Detected Regal version, or null when missing or unsupported. */
  regal: string | null;
  /** Diagnostics produced while probing. */
  diagnostics: Array<{
    /** Stable diagnostic identifier. */
    code: string;
    /** Human-readable detail. */
    message: string;
  }>;
  /** Whether the OPA version probe passed. */
  opaStatus: 'passed' | 'failed';
  /** Whether the Regal version probe passed. */
  regalStatus: 'passed' | 'failed';
}

/**
 * Probe installed OPA and Regal versions for policy commands.
 *
 * @param this - CLI context
 * @param resolvedDir - Absolute policy bundle directory
 * @param runner - Captured subprocess runner
 * @returns Detected versions and diagnostics
 */
export async function probePolicyToolVersions(
  this: LocalContext,
  resolvedDir: string,
  runner: CapturedProcessRunner,
): Promise<ProbePolicyToolVersionsResult> {
  const diagnostics: ProbePolicyToolVersionsResult['diagnostics'] = [];
  let opa: string | null = null;
  let regal: string | null = null;
  let opaStatus: 'passed' | 'failed' = 'failed';
  let regalStatus: 'passed' | 'failed' = 'failed';

  const opaVersionResult = await runner('opa', ['version'], { cwd: resolvedDir }, this);
  if (opaVersionResult.error?.code === 'ENOENT') {
    diagnostics.push({ code: 'opa.missing', message: OPA_MISSING_MESSAGE });
  } else {
    const opaVersionOutput = `${opaVersionResult.stdout}\n${opaVersionResult.stderr}`;
    const unsupportedOpa = unsupportedOpaVersionMessage(opaVersionOutput);
    if (opaVersionResult.code !== 0 || unsupportedOpa) {
      diagnostics.push({
        code: 'opa.version',
        message:
          unsupportedOpa ??
          getPolicyProcessFailureMessage(
            opaVersionResult,
            'Unable to determine the installed OPA version.',
          ),
      });
    } else {
      opa = parsePolicyToolVersion(opaVersionOutput)!.version;
      opaStatus = 'passed';
    }
  }

  const regalVersionResult = await runner('regal', ['version'], { cwd: resolvedDir }, this);
  if (regalVersionResult.error?.code === 'ENOENT') {
    diagnostics.push({ code: 'regal.missing', message: REGAL_MISSING_MESSAGE });
  } else {
    const regalVersionOutput = `${regalVersionResult.stdout}\n${regalVersionResult.stderr}`;
    const unsupportedRegal = unsupportedRegalVersionMessage(regalVersionOutput);
    if (regalVersionResult.code !== 0 || unsupportedRegal) {
      diagnostics.push({
        code: 'regal.version',
        message:
          unsupportedRegal ??
          getPolicyProcessFailureMessage(
            regalVersionResult,
            'Unable to determine the installed Regal version.',
          ),
      });
    } else {
      regal = parsePolicyToolVersion(regalVersionOutput)!.version;
      regalStatus = 'passed';
    }
  }

  return { opa, regal, diagnostics, opaStatus, regalStatus };
}
