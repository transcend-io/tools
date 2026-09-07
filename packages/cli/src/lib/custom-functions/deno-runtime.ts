/** Supported local Deno major version. */
export const SUPPORTED_DENO_MAJOR_VERSION = 2;

/** Exact Deno version used by generated CI. */
export const GENERATED_DENO_VERSION = '2.5.6';

/** Official Deno installation instructions. */
export const DENO_INSTALL_URL = 'https://docs.deno.com/runtime/getting_started/installation/';

/** Parsed Deno runtime version. */
export interface DenoRuntimeVersion {
  /** Complete semantic version reported by Deno. */
  version: string;
  /** Semantic major version. */
  major: number;
}

/**
 * Parse the first line of `deno --version`.
 *
 * @param output - Captured standard output
 * @returns Parsed runtime version
 */
export function parseDenoRuntimeVersion(output: string): DenoRuntimeVersion | undefined {
  const match = output.match(/^deno\s+((\d+)\.\d+\.\d+(?:[-+][^\s]+)?)(?:\s|$)/mu);
  if (!match) {
    return undefined;
  }
  return {
    version: match[1]!,
    major: Number(match[2]),
  };
}

/**
 * Explain why a reported Deno version cannot be used.
 *
 * @param output - Captured `deno --version` output
 * @returns Requirement error, or undefined for supported Deno
 */
export function unsupportedDenoVersionMessage(output: string): string | undefined {
  const runtime = parseDenoRuntimeVersion(output);
  if (runtime?.major === SUPPORTED_DENO_MAJOR_VERSION) {
    return undefined;
  }
  const found = runtime ? `; found ${runtime.version}` : '';
  return `Deno ${SUPPORTED_DENO_MAJOR_VERSION}.x is required${found}. Install or upgrade it from ${DENO_INSTALL_URL}`;
}
