import fs from 'node:fs';
import path from 'node:path';

/** Fields for building a policy bundle upload form. */
export interface BuildPolicyBundleFormDataOptions {
  /** Absolute path to the bundle tarball */
  bundlePath: string;
  /** Version label */
  version: string;
  /** Optional description */
  description?: string;
  /** Bundle name (only for create) */
  bundleName?: string;
}

/**
 * Builds multipart form data for a policy bundle upload.
 *
 * @param options - Upload fields
 * @returns FormData ready for POST
 */
export function buildPolicyBundleFormData(options: BuildPolicyBundleFormDataOptions): FormData {
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
