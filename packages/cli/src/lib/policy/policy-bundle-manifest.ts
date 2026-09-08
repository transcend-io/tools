/** Shape of the policy bundle `manifest.json` accepted by Policy Engine. */
export interface PolicyBundleManifest {
  /** Roots of the bundle, such as `policy_engine/transcend`. */
  roots: string[];
}

/** In-memory Rego file used to validate a policy bundle. */
export interface PolicyBundleRegoFile {
  /** POSIX-style path relative to the policy bundle directory. */
  path: string;
  /** Rego source contents. */
  contents: string;
}

/** Validated publishable policy bundle contents. */
export interface ValidatedPolicyBundleContents {
  /** Parsed and validated bundle manifest. */
  manifest: PolicyBundleManifest;
  /** Publishable Rego paths, excluding local test modules. */
  publishableRegoPaths: string[];
}

/**
 * Returns whether a relative path is a publishable Rego policy file.
 *
 * OPA test files (`*_test.rego`) are local-only and excluded from uploads.
 *
 * @param relativePath - Path relative to the bundle directory
 * @returns Whether the file belongs in the uploaded archive
 */
export function isPublishableRegoFile(relativePath: string): boolean {
  return relativePath.endsWith('.rego') && !relativePath.endsWith('_test.rego');
}

/**
 * Parse and validate the Policy Engine bundle manifest.
 *
 * @param contents - Raw manifest contents, or undefined when absent
 * @returns Parsed manifest
 */
export function parsePolicyBundleManifest(contents: string | undefined): PolicyBundleManifest {
  if (contents === undefined) {
    throw new Error('Policy bundle directory must contain a manifest.json file.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `manifest.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('manifest.json must contain a JSON object.');
  }

  const roots = (parsed as { roots?: unknown }).roots;
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new Error(
      'manifest.json must declare "roots" as a non-empty array of strings (e.g. {"roots":["policy_engine"]}).',
    );
  }
  if (!roots.every((root) => typeof root === 'string' && root.length > 0)) {
    throw new Error('manifest.json "roots" must be an array of non-empty strings.');
  }

  return { roots };
}

/** Matches a Rego `package <path>` declaration. */
const PACKAGE_DECLARATION_PATTERN = /^\s*package\s+([A-Za-z_][\w.]*)/mu;

/**
 * Read the dotted package path declared by Rego source.
 *
 * @param contents - Rego source
 * @returns Package path, or undefined when no declaration is present
 */
export function parseRegoPackagePath(contents: string): string | undefined {
  return PACKAGE_DECLARATION_PATTERN.exec(contents)?.[1];
}

/**
 * Validate the manifest, publishable file requirement, and root coverage.
 *
 * This is the shared pure upload contract used by both `policy lint` and
 * `policy publish`.
 *
 * @param manifestContents - Raw manifest contents, or undefined when absent
 * @param regoFiles - All Rego files in the policy directory
 * @returns Validated manifest and publishable paths
 */
export function validatePolicyBundleContents(
  manifestContents: string | undefined,
  regoFiles: readonly PolicyBundleRegoFile[],
): ValidatedPolicyBundleContents {
  const manifest = parsePolicyBundleManifest(manifestContents);
  const publishableFiles = regoFiles
    .filter(({ path }) => isPublishableRegoFile(path))
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path));
  if (publishableFiles.length === 0) {
    throw new Error('Policy bundle directory must contain at least one .rego policy file.');
  }

  const rootPrefixes = manifest.roots.map((root) => root.replace(/\//gu, '.'));
  const uncovered = publishableFiles.flatMap(({ path, contents }) => {
    const packagePath = parseRegoPackagePath(contents);
    if (
      !packagePath ||
      rootPrefixes.some((prefix) => packagePath === prefix || packagePath.startsWith(`${prefix}.`))
    ) {
      return [];
    }
    return [
      `  - ${path} (package ${packagePath}) is not covered by roots [${manifest.roots.join(', ')}]`,
    ];
  });
  if (uncovered.length > 0) {
    throw new Error(
      [
        'manifest.json "roots" do not cover all Rego packages in the bundle; ' +
          'uncovered packages will fail-closed at decide time. Either broaden "roots" or move the policy under a covered package:',
        ...uncovered,
      ].join('\n'),
    );
  }

  return {
    manifest,
    publishableRegoPaths: publishableFiles.map(({ path }) => path),
  };
}
