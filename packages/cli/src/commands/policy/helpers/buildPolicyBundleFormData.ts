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

/** Runtime dependencies used to build policy bundle form data. */
export interface BuildPolicyBundleFormDataDependencies {
  /** Filesystem operations used to read the bundle. */
  readonly fs: Pick<typeof fs, 'readFileSync'>;
  /** Path operations used to name the uploaded bundle. */
  readonly path: Pick<typeof path, 'basename'>;
}

const defaultDependencies: BuildPolicyBundleFormDataDependencies = {
  fs,
  path,
};

/**
 * Builds multipart form data for a policy bundle upload.
 *
 * @param options - Upload fields
 * @param dependencies - Runtime dependencies used to read and name the bundle
 * @returns FormData ready for POST
 */
export function buildPolicyBundleFormData(
  options: BuildPolicyBundleFormDataOptions,
  dependencies: BuildPolicyBundleFormDataDependencies = defaultDependencies,
): FormData {
  const bundleBytes = dependencies.fs.readFileSync(options.bundlePath);
  const form = new FormData();
  form.append(
    'bundle',
    new Blob([bundleBytes], { type: 'application/gzip' }),
    dependencies.path.basename(options.bundlePath),
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
