/** Deno version pinned in generated CI to match the current production runtime. */
export const RECOMMENDED_DENO_VERSION = '2.4.5';

/** Deno major version supported by local Custom Function tooling. */
export const SUPPORTED_DENO_MAJOR_VERSION = 2;

/** Official Deno installation instructions. */
export const DENO_INSTALL_URL = 'https://docs.deno.com/runtime/getting_started/installation/';

/** Parsed Deno runtime version. */
export interface DenoRuntimeVersion {
  /** Complete semantic version reported by Deno. */
  version: string;
  /** Semantic major version. */
  major: number;
}

/** Compatibility result for one installed Deno runtime. */
export type DenoRuntimeCompatibility =
  | {
      /** Exact production match. */
      level: 'compatible';
    }
  | {
      /** Compatible major with a different production pin. */
      level: 'warning';
      /** Human-readable compatibility guidance. */
      message: string;
    }
  | {
      /** Unsupported or unreadable runtime version. */
      level: 'error';
      /** Human-readable requirement error. */
      message: string;
    };

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
 * Compare an installed Deno runtime with the supported major and production pin.
 *
 * @param output - Captured `deno --version` output
 * @returns Compatibility and optional guidance
 */
export function getDenoRuntimeCompatibility(output: string): DenoRuntimeCompatibility {
  const runtime = parseDenoRuntimeVersion(output);
  if (!runtime) {
    return {
      level: 'error',
      message: `Deno ${SUPPORTED_DENO_MAJOR_VERSION}.x is required, but the installed version could not be determined. Install or switch versions using ${DENO_INSTALL_URL}`,
    };
  }
  if (runtime.major !== SUPPORTED_DENO_MAJOR_VERSION) {
    return {
      level: 'error',
      message: `Deno ${SUPPORTED_DENO_MAJOR_VERSION}.x is required; found ${runtime.version}. Install or switch versions using ${DENO_INSTALL_URL}`,
    };
  }
  if (runtime.version !== RECOMMENDED_DENO_VERSION) {
    return {
      level: 'warning',
      message: `Deno ${runtime.version} is compatible, but ${RECOMMENDED_DENO_VERSION} matches the current production runtime.`,
    };
  }
  return { level: 'compatible' };
}
