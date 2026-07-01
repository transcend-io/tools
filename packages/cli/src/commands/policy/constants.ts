/** Maximum compressed policy bundle upload size in bytes (5 KiB). */
export const MAX_BUNDLE_COMPRESSED_BYTES = 5120;

/** Maximum decompressed policy bundle size enforced by the server (50 KiB). */
export const MAX_BUNDLE_DECOMPRESSED_BYTES = 51200;

/** Error message shown when the OPA CLI is not installed. */
export const OPA_INSTALL_HINT =
  'The Open Policy Agent CLI (`opa`) is required but was not found on PATH. ' +
  'Install it with `brew install opa` (macOS) or see https://www.openpolicyagent.org/docs/cli#install';

/** Placeholder for nullable API fields in table output. */
export const EMPTY_CELL = '-';
