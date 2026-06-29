import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import got, { type Got } from 'got';

/** Maximum compressed policy bundle upload size in bytes (5 KiB). */
export const MAX_BUNDLE_COMPRESSED_BYTES = 5120;

/** Maximum decompressed policy bundle size enforced by the server (50 KiB). */
export const MAX_BUNDLE_DECOMPRESSED_BYTES = 51200;

/** A policy bundle parent record. */
export interface PolicyBundle {
  /** Bundle UUID */
  id: string;
  /** Tenant-unique bundle name */
  bundleName: string;
  /** Human-readable description */
  description: string | null;
  /** Active version UUID, if any */
  activeVersionId: string | null;
  /** When a version was last activated */
  lastActivatedAt: string | null;
  /** When the bundle was created */
  createdAt: string;
  /** When the bundle was last updated */
  updatedAt: string;
}

/** An immutable policy bundle version. */
export interface PolicyBundleVersion {
  /** Version UUID */
  id: string;
  /** Caller-supplied version label */
  version: string;
  /** SHA-256 hex digest of compiled bundle bytes */
  sha256: string;
  /** Size of compiled bundle in bytes */
  sizeBytes: number;
  /** Human-readable description */
  description: string | null;
  /** Actor who uploaded the version */
  createdBy: string;
  /** When the version was activated, if ever */
  activatedAt: string | null;
  /** When the version was deactivated, if ever */
  deactivatedAt: string | null;
  /** When the version was uploaded */
  createdAt: string;
  /** When the version was last updated */
  updatedAt: string;
}

/** Offset-paginated list of policy bundles. */
export interface PolicyBundleListResponse {
  /** Bundles on this page */
  nodes: PolicyBundle[];
  /** Total bundles across all pages */
  totalCount: number;
}

/** Cursor metadata for version list pagination. */
export interface CursorPageInfo {
  /** Whether another forward page exists */
  hasNextPage: boolean;
  /** Whether another backward page exists */
  hasPreviousPage: boolean;
  /** Cursor of the first item on this page */
  startCursor?: string;
  /** Cursor of the last item on this page */
  endCursor?: string;
}

/** Cursor-paginated list of bundle versions. */
export interface PolicyBundleVersionListResponse {
  /** Versions on this page */
  nodes: PolicyBundleVersion[];
  /** Cursor pagination metadata */
  pageInfo: CursorPageInfo;
}

/** Response from creating a bundle and first version. */
export interface CreatePolicyBundleResponse {
  /** Created bundle */
  bundle: PolicyBundle;
  /** Created first version */
  version: PolicyBundleVersion;
}

/** Response from uploading a new version. */
export interface CreatePolicyBundleVersionResponse {
  /** Uploaded version */
  version: PolicyBundleVersion;
}

/** Response from activating a bundle version. */
export interface ActivatePolicyBundleVersionResponse {
  /** Updated bundle */
  bundle: PolicyBundle;
  /** Activated version */
  version: PolicyBundleVersion;
}

const OPA_INSTALL_HINT =
  'The Open Policy Agent CLI (`opa`) is required but was not found on PATH. ' +
  'Install it with `brew install opa` (macOS) or see https://www.openpolicyagent.org/docs/cli#install';

/**
 * Ensures the `opa` binary is available on PATH.
 *
 * @throws Error when `opa` is not installed
 */
export function assertOpaInstalled(): void {
  const result = spawnSync('opa', ['version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new Error(OPA_INSTALL_HINT);
  }
}

/**
 * Runs an OPA CLI command and streams stdout/stderr to the current process.
 *
 * @param args - Arguments passed to the `opa` binary
 * @param options - Optional working directory
 * @returns The child process exit code
 */
export function runOpa(args: string[], options: { cwd?: string } = {}): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const child = spawn('opa', args, {
      cwd: options.cwd,
      stdio: 'inherit',
    });

    child.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(OPA_INSTALL_HINT));
        return;
      }
      reject(err);
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

/**
 * Builds an OPA bundle tarball from a local policy directory.
 *
 * @param dir - Directory containing `.rego` files and optional `data.json`
 * @returns Absolute path to the generated `.tar.gz` bundle
 */
export async function buildOpaBundleTarball(dir: string): Promise<string> {
  assertOpaInstalled();

  const resolvedDir = path.resolve(dir);
  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`Policy directory does not exist or is not a directory: ${resolvedDir}`);
  }

  const outputPath = path.join(
    os.tmpdir(),
    `transcend-policy-bundle-${Date.now()}-${Math.random().toString(36).slice(2)}.tar.gz`,
  );

  const exitCode = await runOpa(['build', '-b', resolvedDir, '-o', outputPath]);
  if (exitCode !== 0) {
    throw new Error(`opa build failed with exit code ${exitCode}`);
  }

  const size = fs.statSync(outputPath).size;
  if (size > MAX_BUNDLE_COMPRESSED_BYTES) {
    fs.unlinkSync(outputPath);
    throw new Error(
      `Policy bundle exceeds the ${MAX_BUNDLE_COMPRESSED_BYTES} byte compressed upload limit (${size} bytes). ` +
        `The server also rejects decompressed bundles larger than ${MAX_BUNDLE_DECOMPRESSED_BYTES} bytes.`,
    );
  }

  return outputPath;
}

/**
 * Creates a got client for Policy Engine REST endpoints on the monolith.
 *
 * @param transcendUrl - Transcend API base URL
 * @param auth - Transcend API key
 * @returns Configured got instance
 */
export function buildPolicyEngineClient(transcendUrl: string, auth: string): Got {
  return got.extend({
    prefixUrl: transcendUrl.replace(/\/$/, ''),
    headers: {
      Authorization: `Bearer ${auth}`,
      accept: 'application/json',
    },
  });
}

/**
 * Resolves a bundle name to its UUID by scanning offset-paginated bundle listings.
 *
 * @param client - Policy Engine REST client
 * @param bundleName - Bundle name to resolve
 * @returns Bundle UUID when found
 */
export async function resolveBundleIdByName(
  client: Got,
  bundleName: string,
): Promise<string | undefined> {
  const limit = 100;
  let offset = 0;

  while (true) {
    const body = await client
      .get('api/v1/policy-engine/policy-bundles', {
        searchParams: { limit, offset },
      })
      .json<PolicyBundleListResponse>();

    const match = body.nodes.find((bundle) => bundle.bundleName === bundleName);
    if (match) {
      return match.id;
    }

    offset += body.nodes.length;
    if (offset >= body.totalCount || body.nodes.length === 0) {
      return undefined;
    }
  }
}

/**
 * Resolves a bundle identifier from an explicit UUID or bundle name.
 *
 * @param client - Policy Engine REST client
 * @param options - Bundle lookup options
 * @returns Bundle UUID
 */
export async function resolvePolicyBundleId(
  client: Got,
  options: {
    /** Explicit bundle UUID */
    policyBundleId?: string;
    /** Bundle name to resolve */
    bundleName?: string;
  },
): Promise<string> {
  if (options.policyBundleId) {
    return options.policyBundleId;
  }

  if (options.bundleName) {
    const bundleId = await resolveBundleIdByName(client, options.bundleName);
    if (bundleId) {
      return bundleId;
    }
    throw new Error(`Policy bundle "${options.bundleName}" was not found for this organization.`);
  }

  throw new Error('Must specify --policyBundleId or --bundleName.');
}

/**
 * Returns a default version label from git SHA or a timestamp fallback.
 *
 * @param cwd - Working directory for git lookup
 * @returns Version label
 */
export function defaultPolicyVersionLabel(cwd = process.cwd()): string {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  });
  if (result.status === 0) {
    const sha = result.stdout.trim();
    if (sha) {
      return sha;
    }
  }

  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Renders rows as a simple fixed-width text table.
 *
 * @param headers - Column headers
 * @param rows - Table rows
 * @returns Formatted table string
 */
export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? '').length)),
  );

  const formatRow = (cells: string[]): string =>
    cells.map((cell, index) => cell.padEnd(widths[index] ?? cell.length)).join('  ');

  const divider = widths.map((width) => '-'.repeat(width)).join('  ');
  return [formatRow(headers), divider, ...rows.map((row) => formatRow(row))].join('\n');
}

/**
 * Prints JSON or a human-readable table to stdout.
 *
 * @param stdout - Process stdout stream
 * @param options - Output options
 */
export function printResult(
  stdout: NodeJS.WriteStream,
  options: {
    /** When true, print raw JSON */
    json: boolean;
    /** JSON-serializable payload */
    data: unknown;
    /** Table renderer used when json is false */
    renderTable?: () => string;
  },
): void {
  if (options.json) {
    stdout.write(`${JSON.stringify(options.data, null, 2)}\n`);
    return;
  }

  if (options.renderTable) {
    stdout.write(`${options.renderTable()}\n`);
  }
}

/**
 * Builds multipart form data for a policy bundle upload.
 *
 * @param options - Upload fields
 * @returns FormData ready for POST
 */
export function buildPolicyBundleFormData(options: {
  /** Absolute path to the bundle tarball */
  bundlePath: string;
  /** Version label */
  version: string;
  /** Optional description */
  description?: string;
  /** Bundle name (only for create) */
  bundleName?: string;
}): FormData {
  const bundleBytes = fs.readFileSync(options.bundlePath);
  const form = new FormData();
  form.append(
    'bundle',
    new Blob([bundleBytes], { type: 'application/gzip' }),
    path.basename(options.bundlePath),
  );
  form.append('version', options.version);
  if (options.description) {
    form.append('description', options.description);
  }
  if (options.bundleName) {
    form.append('bundleName', options.bundleName);
  }
  return form;
}

/**
 * Formats a policy bundle version for human-readable CLI output.
 *
 * @param version - Version record from the API
 * @returns Summary lines
 */
export function formatPolicyBundleVersionSummary(version: PolicyBundleVersion): string {
  return [
    `id          ${version.id}`,
    `version     ${version.version}`,
    `createdAt   ${version.createdAt}`,
    `activatedAt ${version.activatedAt ?? '-'}`,
  ].join('\n');
}
