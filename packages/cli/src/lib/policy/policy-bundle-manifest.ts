import { findDirectDataReferences, parseRegoPackageReference } from './rego-reference.js';

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
  if (
    !roots.every((root) =>
      root.split('/').every((segment: string) => /^[A-Za-z_][A-Za-z0-9_]*$/u.test(segment)),
    )
  ) {
    throw new Error(
      'manifest.json "roots" must contain slash-separated Rego identifiers so Policy Engine can re-namespace them safely.',
    );
  }

  return { roots };
}

/**
 * Determine whether one document path starts with another.
 *
 * @param segments - Complete document path
 * @param prefix - Candidate root
 * @returns Whether the root covers the document path
 */
function hasSegmentPrefix(segments: readonly string[], prefix: readonly string[]): boolean {
  return (
    segments.length >= prefix.length &&
    prefix.every((segment, index) => segment === segments[index])
  );
}

/**
 * Match the package syntax supported by Policy Engine activation.
 *
 * Bracketed segments remain supported below a declared dotted root.
 *
 * @param reference - Parsed package reference
 * @param root - Declared manifest root
 * @returns Whether activation can re-namespace the package
 */
function rootCoversPackage(reference: { source: string }, root: readonly string[]): boolean {
  const dottedRoot = root.join('.');
  const suffix = reference.source.slice(dottedRoot.length);
  return (
    reference.source.startsWith(dottedRoot) &&
    (suffix === '' || suffix.startsWith('.') || /^\s*\[/u.test(suffix))
  );
}

/**
 * Determine whether `data.<root>` is referenced directly.
 *
 * @param segments - Parsed `data` reference segments
 * @param root - Declared manifest root
 * @returns Whether the reference targets the declared root
 */
function referencesDeclaredRoot(segments: readonly string[], root: readonly string[]): boolean {
  return hasSegmentPrefix(segments.slice(1), root);
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
  const renderedRoots = manifest.roots.join(', ');
  const publishableFiles = regoFiles
    .filter(({ path }) => isPublishableRegoFile(path))
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path));
  if (publishableFiles.length === 0) {
    throw new Error('Policy bundle directory must contain at least one .rego policy file.');
  }

  const rootPrefixes = manifest.roots.map((root) => root.split('/'));
  const uncovered = publishableFiles.flatMap(({ path, contents }) => {
    const packageReference = parseRegoPackageReference(contents);
    if (
      !packageReference ||
      rootPrefixes.some((prefix) => rootCoversPackage(packageReference, prefix))
    ) {
      return [];
    }
    return [
      `  - ${path} (package ${packageReference.source}) is not covered by roots [${renderedRoots}]`,
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

  const unsupportedReferences = publishableFiles.flatMap(({ path, contents }) =>
    findDirectDataReferences(contents)
      .filter(({ reference }) =>
        rootPrefixes.some((prefix) => referencesDeclaredRoot(reference.segments, prefix)),
      )
      .map(
        ({ reference, line }) =>
          `  - ${path}:${line} references ${reference.source}; import that package and use its local name`,
      ),
  );
  if (unsupportedReferences.length > 0) {
    throw new Error(
      [
        'Publishable Rego must not reference its declared bundle roots directly because Policy Engine re-namespaces package imports during activation:',
        ...unsupportedReferences,
      ].join('\n'),
    );
  }

  return {
    manifest,
    publishableRegoPaths: publishableFiles.map(({ path }) => path),
  };
}
