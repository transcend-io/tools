/**
 * Maximum compressed policy bundle upload size in bytes (~10 MiB).
 *
 * Mirrors the server-side `BUNDLE_MAX_BYTES` limit enforced by the Policy
 * Engine API on bundle version upload. The CLI pre-checks this client-side to
 * fail fast before transferring the blob.
 */
export const MAX_BUNDLE_COMPRESSED_BYTES = 10 * 1024 * 1024;

/** Error message shown when the OPA CLI is not installed. */
export const OPA_INSTALL_HINT =
  'The Open Policy Agent CLI (`opa`) is required but was not found on PATH. ' +
  'Install it with `brew install opa` (macOS) or see https://www.openpolicyagent.org/docs/cli#install';

/** Placeholder for nullable API fields in table output. */
export const EMPTY_CELL = '-';
