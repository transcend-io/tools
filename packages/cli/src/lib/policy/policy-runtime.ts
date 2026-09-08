import semver from 'semver';

/** Supported local OPA major version. */
export const SUPPORTED_OPA_MAJOR_VERSION = 1;

/** Oldest Regal release with first-class OPA 1.0 support. */
export const MINIMUM_REGAL_VERSION = '0.30.0';

/** Official OPA installation instructions. */
export const OPA_INSTALL_URL = 'https://www.openpolicyagent.org/docs#1-download-opa';

/** Official Regal installation instructions. */
export const REGAL_INSTALL_URL = 'https://www.openpolicyagent.org/projects/regal#installing-regal';

/** Missing OPA guidance shared by policy commands. */
export const OPA_MISSING_MESSAGE =
  'OPA 1.x is required but `opa` was not found on PATH. ' +
  `Install or upgrade it using the official instructions: ${OPA_INSTALL_URL}`;

/** Missing OPA guidance for commands that support multiple OPA releases. */
export const OPA_CLI_MISSING_MESSAGE =
  'The Open Policy Agent CLI (`opa`) is required but was not found on PATH. ' +
  `Install it using the official instructions: ${OPA_INSTALL_URL}`;

/** Missing Regal guidance for policy verification. */
export const REGAL_MISSING_MESSAGE =
  'Regal is required but `regal` was not found on PATH. ' +
  `Install or upgrade it using the official instructions: ${REGAL_INSTALL_URL}`;

/** Parsed policy tool version. */
export interface PolicyToolVersion {
  /** Complete semantic version reported by the tool. */
  version: string;
  /** Semantic major version. */
  major: number;
}

/**
 * Parse the version field from OPA or Regal version output.
 *
 * Both tools emit a `Version:` line and may prefix the value with `v`.
 *
 * @param output - Captured version output
 * @returns Parsed semantic version
 */
export function parsePolicyToolVersion(output: string): PolicyToolVersion | undefined {
  const match = output.match(
    /^\s*Version:\s+v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)\s*$/imu,
  );
  if (!match || !semver.valid(match[1])) {
    return undefined;
  }
  return {
    version: match[1],
    major: semver.major(match[1]),
  };
}

/**
 * Explain why an OPA version cannot run policy verification.
 *
 * @param output - Captured `opa version` output
 * @returns Requirement error, or undefined for supported OPA
 */
export function unsupportedOpaVersionMessage(output: string): string | undefined {
  const runtime = parsePolicyToolVersion(output);
  if (runtime?.major === SUPPORTED_OPA_MAJOR_VERSION) {
    return undefined;
  }
  const found = runtime ? `; found ${runtime.version}` : '; unable to parse the installed version';
  return (
    `OPA ${SUPPORTED_OPA_MAJOR_VERSION}.x is required${found}. ` +
    `Install or upgrade it using the official instructions: ${OPA_INSTALL_URL}`
  );
}

/**
 * Explain why a Regal version cannot run OPA 1 policy verification.
 *
 * @param output - Captured `regal version` output
 * @returns Requirement error, or undefined for supported Regal
 */
export function unsupportedRegalVersionMessage(output: string): string | undefined {
  const runtime = parsePolicyToolVersion(output);
  if (runtime && semver.gte(runtime.version, MINIMUM_REGAL_VERSION)) {
    return undefined;
  }
  const found = runtime ? `; found ${runtime.version}` : '; unable to parse the installed version';
  return (
    `Regal ${MINIMUM_REGAL_VERSION} or newer is required for OPA 1 support${found}. ` +
    `Install or upgrade it using the official instructions: ${REGAL_INSTALL_URL}`
  );
}
