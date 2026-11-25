import {
  POLICY_MANIFEST_FILENAME,
  POLICY_MANIFEST_TRANSCEND_METADATA_KEY,
  POLICY_TEMPLATE_NAMES,
  type PolicyTemplateName,
} from './policy-scaffold-templates.js';
import { findDirectDataReferences, parseRegoPackageReference } from './rego-reference.js';

/** Shape of the policy bundle `.manifest` accepted by Policy Engine. */
export interface PolicyBundleManifest {
  /** Roots of the bundle, such as `policy_engine/transcend`. */
  roots: string[];
  /**
   * Optional scaffold template from `metadata.transcend.io.template`.
   *
   * Authoring hint only — upload does not branch on it. Permissions API
   * still keys off the remote bundle name `permissions`.
   */
  template?: PolicyTemplateName;
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
    throw new Error(`Policy bundle directory must contain a ${POLICY_MANIFEST_FILENAME} file.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `${POLICY_MANIFEST_FILENAME} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${POLICY_MANIFEST_FILENAME} must contain a JSON object.`);
  }

  const roots = (parsed as { roots?: unknown }).roots;
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new Error(
      `${POLICY_MANIFEST_FILENAME} must declare "roots" as a non-empty array of strings (e.g. {"roots":["policy_engine"]}).`,
    );
  }
  if (!roots.every((root) => typeof root === 'string' && root.length > 0)) {
    throw new Error(`${POLICY_MANIFEST_FILENAME} "roots" must be an array of non-empty strings.`);
  }
  if (
    !roots.every((root) =>
      root.split('/').every((segment: string) => /^[A-Za-z_][A-Za-z0-9_]*$/u.test(segment)),
    )
  ) {
    throw new Error(
      `${POLICY_MANIFEST_FILENAME} "roots" must contain slash-separated Rego identifiers so Policy Engine can re-namespace them safely.`,
    );
  }

  const template = parseOptionalManifestTemplate(parsed);

  return template === undefined ? { roots } : { roots, template };
}

/**
 * Read an optional `metadata.transcend.io.template` authoring hint.
 *
 * Invalid or unknown values are ignored so upload validation stays focused on
 * roots and Rego coverage.
 *
 * @param parsed - Parsed `.manifest` object
 * @returns Known template name, or undefined
 */
function parseOptionalManifestTemplate(parsed: object): PolicyTemplateName | undefined {
  const metadata = (parsed as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }
  const transcend = (metadata as Record<string, unknown>)[POLICY_MANIFEST_TRANSCEND_METADATA_KEY];
  if (!transcend || typeof transcend !== 'object' || Array.isArray(transcend)) {
    return undefined;
  }
  const template = (transcend as { template?: unknown }).template;
  if (typeof template !== 'string') {
    return undefined;
  }
  return POLICY_TEMPLATE_NAMES.includes(template as PolicyTemplateName)
    ? (template as PolicyTemplateName)
    : undefined;
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
 * This is the shared pure upload contract used by both `policy check` and
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
        `${POLICY_MANIFEST_FILENAME} "roots" do not cover all Rego packages in the bundle; ` +
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
