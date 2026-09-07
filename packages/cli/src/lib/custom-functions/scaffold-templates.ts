import type { CustomFunctionManifestEntry } from './manifest.js';

/** Supported Custom Function scaffold templates. */
export const CUSTOM_FUNCTION_TEMPLATE_NAMES = [
  'general',
  'dsr-datapoint',
  'dsr-enricher',
  'dsr-both',
] as const;

/** A supported Custom Function scaffold template. */
export type CustomFunctionTemplateName = (typeof CUSTOM_FUNCTION_TEMPLATE_NAMES)[number];

/** One generated, manifest-relative scaffold file. */
export interface GeneratedCustomFunctionFile {
  /** Path relative to the Custom Function manifest. */
  path: string;
  /** Complete deterministic file contents. */
  contents: string;
}

/** Pure output used to plan a Custom Function scaffold. */
export interface GeneratedCustomFunctionTemplate {
  /** Normalized display name retained in the manifest. */
  displayName: string;
  /** Filesystem-safe name used by source and payload files. */
  slug: string;
  /** Generated TypeScript source file. */
  sourceFile: GeneratedCustomFunctionFile;
  /** Generated JSON test payload files. */
  payloadFiles: GeneratedCustomFunctionFile[];
  /** Manifest entry matching the generated source and payloads. */
  manifestEntry: CustomFunctionManifestEntry;
}

const MAX_SLUG_LENGTH = 80;
const WINDOWS_RESERVED_FILENAME = /^(?:con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])$/i;

/**
 * Convert a display name to an ASCII kebab-case filename stem.
 *
 * @param displayName - Human-readable Custom Function name
 * @returns Filesystem-safe kebab-case slug
 */
export function deriveCustomFunctionSlug(displayName: string): string {
  const normalizedName = normalizeAndValidateDisplayName(displayName);
  const slug = slugify(normalizedName);
  validateSlug(slug);
  return slug;
}

/**
 * Validate and normalize a customer-visible Custom Function name.
 *
 * @param displayName - Proposed human-readable name
 * @returns Trimmed name with internal whitespace normalized
 */
export function validateCustomFunctionDisplayName(displayName: string): string {
  const normalizedName = normalizeAndValidateDisplayName(displayName);
  validateSlug(slugify(normalizedName));
  return normalizedName;
}

/**
 * Generate source, test payloads, and matching manifest data without I/O.
 *
 * @param displayName - Human-readable Custom Function name
 * @param templateName - Handler shape to generate
 * @returns Deterministic scaffold contents
 */
export function generateCustomFunctionTemplate(
  displayName: string,
  templateName: CustomFunctionTemplateName,
): GeneratedCustomFunctionTemplate {
  const normalizedName = validateCustomFunctionDisplayName(displayName);
  const slug = deriveCustomFunctionSlug(normalizedName);
  const sourcePath = `functions/${slug}.ts`;
  const sourceFile = {
    path: sourcePath,
    contents: buildSource(templateName),
  };

  if (templateName === 'general') {
    const payloadFile = buildPayloadFile(`test-payloads/${slug}.json`, buildGeneralPayload());
    return {
      displayName: normalizedName,
      slug,
      sourceFile,
      payloadFiles: [payloadFile],
      manifestEntry: {
        name: normalizedName,
        code: toManifestPath(sourcePath),
        'test-payload': toManifestPath(payloadFile.path),
      },
    };
  }

  const payloadFiles: GeneratedCustomFunctionFile[] = [];
  if (templateName === 'dsr-datapoint' || templateName === 'dsr-both') {
    payloadFiles.push(
      buildPayloadFile(`test-payloads/${slug}-datapoint.json`, buildDataPointPayload()),
    );
  }
  if (templateName === 'dsr-enricher' || templateName === 'dsr-both') {
    payloadFiles.push(
      buildPayloadFile(`test-payloads/${slug}-enricher.json`, buildEnricherPayload()),
    );
  }

  const manifestEntry: CustomFunctionManifestEntry = {
    name: normalizedName,
    code: toManifestPath(sourcePath),
    type: 'DSR',
    env: {
      TRANSCEND_API_KEY: '<<parameters.transcendApiKey>>',
    },
  };

  if (templateName === 'dsr-datapoint') {
    manifestEntry['test-payload'] = toManifestPath(payloadFiles[0]!.path);
    manifestEntry['test-payload-type'] = 'DATA_POINT';
  } else if (templateName === 'dsr-enricher') {
    manifestEntry['test-payload'] = toManifestPath(payloadFiles[0]!.path);
    manifestEntry['test-payload-type'] = 'REQUEST_ENRICHER';
  } else if (templateName === 'dsr-both') {
    manifestEntry['test-payloads'] = [
      {
        payload: toManifestPath(payloadFiles[0]!.path),
        'payload-type': 'DATA_POINT',
      },
      {
        payload: toManifestPath(payloadFiles[1]!.path),
        'payload-type': 'REQUEST_ENRICHER',
      },
    ];
  } else {
    throw new Error(`Unsupported Custom Function template: ${String(templateName)}`);
  }

  return {
    displayName: normalizedName,
    slug,
    sourceFile,
    payloadFiles,
    manifestEntry,
  };
}

/**
 * Namespaced directory and frontmatter name for the installed Agent Skill.
 */
export const CUSTOM_FUNCTION_SKILL_NAME = 'transcend-io-custom-functions';

/**
 * Canonical customer-facing Agent Skill installed by Custom Function setup.
 */
export const CUSTOM_FUNCTION_SKILL_MD = `---
name: ${CUSTOM_FUNCTION_SKILL_NAME}
description: Build, validate, and deploy Transcend Custom Functions safely.
---

# Transcend Custom Functions

Import \`CustomFunction\` as a type from \`@transcend-io/custom-function-types\`. General functions default-export a handler using \`CustomFunction.GeneralArgument\`. DSR datapoints default-export \`CustomFunction.Argument\`; DSR request enrichers export \`enricher\` using \`CustomFunction.EnricherArgument\`.

Handlers receive \`payload\`, \`environment\`, \`sdk\`, and \`kv\`. Use the payload for trigger data, environment for configured values, the SDK for Transcend calls, and the key-value store for small persistent strings. Check \`response.ok\` for every \`sdk.fetch\` call and include useful response details in failures.

Keep source and test-payload paths relative to \`transcend-functions.yml\`. Match every DSR export with its \`DATA_POINT\` or \`REQUEST_ENRICHER\` payload. Never commit secrets: use \`<<parameters.name>>\` manifest placeholders locally and secret stores in CI.

Run \`transcend custom-functions check <custom-function-directory>\`, then \`transcend custom-functions push --file=<custom-function-directory>/transcend-functions.yml --auth="$TRANSCEND_API_KEY" --dryRun\`. Use \`--promote=false\` when a revision should remain a draft; promote deliberately, and use \`--updateManifest\` on the first push to record assigned IDs.

Custom Functions run on Deno. Avoid Node-only APIs and undeclared third-party imports. Add every external network destination to \`allowed-hosts\`; Transcend SDK routes do not require an allowed-host entry.
`;

/**
 * Normalize the display name before validating its path-related properties.
 *
 * @param displayName - Proposed display name
 * @returns Normalized display name
 */
function normalizeAndValidateDisplayName(displayName: string): string {
  if (/[\u0000-\u001f\u007f]/u.test(displayName)) {
    throw new Error('Custom Function name cannot contain control characters.');
  }
  if (/[\\/]/u.test(displayName)) {
    throw new Error('Custom Function name cannot contain path separators.');
  }

  const normalizedName = displayName.trim().replace(/\s+/gu, ' ');
  if (!normalizedName) {
    throw new Error('Custom Function name cannot be empty.');
  }
  return normalizedName;
}

/**
 * Derive an unvalidated slug from a normalized display name.
 *
 * @param displayName - Normalized display name
 * @returns Candidate slug
 */
function slugify(displayName: string): string {
  return displayName
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/['’]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

/**
 * Reject candidate slugs that are not portable filenames.
 *
 * @param slug - Candidate filename stem
 */
function validateSlug(slug: string): void {
  if (!slug) {
    throw new Error('Custom Function name must contain a letter or number.');
  }
  if (slug.length > MAX_SLUG_LENGTH) {
    throw new Error(`Custom Function slug cannot exceed ${MAX_SLUG_LENGTH} characters.`);
  }
  if (WINDOWS_RESERVED_FILENAME.test(slug)) {
    throw new Error(`Custom Function name resolves to reserved filename "${slug}".`);
  }
}

/**
 * Prefix a generated relative path for manifest storage.
 *
 * @param path - Relative generated file path
 * @returns Explicit manifest-relative path
 */
function toManifestPath(path: string): string {
  return `./${path}`;
}

/**
 * Serialize a payload with stable indentation and a final newline.
 *
 * @param path - Manifest-relative payload path
 * @param payload - JSON-compatible payload
 * @returns Generated payload file
 */
function buildPayloadFile(path: string, payload: object): GeneratedCustomFunctionFile {
  return {
    path,
    contents: `${JSON.stringify(payload, null, 2)}\n`,
  };
}

/**
 * Select the source template for one handler shape.
 *
 * @param templateName - Handler shape
 * @returns TypeScript source
 */
function buildSource(templateName: CustomFunctionTemplateName): string {
  const importStatement =
    "import type { CustomFunction } from '@transcend-io/custom-function-types';";

  switch (templateName) {
    case 'general':
      return `${importStatement}

/**
 * Handle a General Custom Function invocation.
 *
 * @param argument - Services and payload supplied by Transcend
 */
export default function customFunction({
  payload,
}: CustomFunction.GeneralArgument): void {
  // TODO: Handle the webhook or schedule payload.
  void payload;
}
`;
    case 'dsr-datapoint':
      return `${importStatement}

${buildDataPointHandler()}
`;
    case 'dsr-enricher':
      return `${importStatement}

${buildEnricherHandler()}
`;
    case 'dsr-both':
      return `${importStatement}

${buildDataPointHandler()}

${buildEnricherHandler()}
`;
    default:
      throw new Error(`Unsupported Custom Function template: ${String(templateName)}`);
  }
}

/**
 * Build the DSR datapoint default export.
 *
 * @returns TypeScript source
 */
function buildDataPointHandler(): string {
  return `/**
 * Resolve a data subject request datapoint.
 *
 * @param argument - Services and payload supplied by Transcend
 */
export default async function customFunction({
  environment,
  payload,
  sdk,
}: CustomFunction.Argument): Promise<void> {
  if (payload.type !== 'ACCESS') {
    throw new Error(\`Unsupported request type: \${payload.type}\`);
  }

  // TODO: Fetch the matching record from your customer API.
  // TODO: Map that record into the profiles array.
  const profiles: unknown[] = [];
  const response = await sdk.fetch('/v1/data-silo', {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${environment.TRANSCEND_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profiles, status: 'READY' }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      \`Failed to report ACCESS results: status=\${response.status} statusText=\${response.statusText} body=\${body}\`,
    );
  }
}`;
}

/**
 * Build the DSR request-enricher named export.
 *
 * @returns TypeScript source
 */
function buildEnricherHandler(): string {
  return `/**
 * Enrich identifiers before a data subject request runs.
 *
 * @param argument - Services and payload supplied by Transcend
 */
export async function enricher({
  environment,
  sdk,
}: CustomFunction.EnricherArgument): Promise<void> {
  // TODO: Query your customer API and map discovered identifiers here.
  const enrichedIdentifiers = {};
  const response = await sdk.fetch('/v1/enrich-identifiers', {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${environment.TRANSCEND_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enrichedIdentifiers }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      \`Failed to report enriched identifiers: status=\${response.status} statusText=\${response.statusText} body=\${body}\`,
    );
  }
}`;
}

/**
 * Build a representative General test payload.
 *
 * @returns JSON-compatible payload
 */
function buildGeneralPayload(): object {
  return {
    event: 'example',
  };
}

/**
 * Build a representative DSR datapoint test payload.
 *
 * @returns JSON-compatible payload
 */
function buildDataPointPayload(): object {
  return {
    type: 'ACCESS',
    dataSubject: {
      type: 'customer',
    },
    isTest: true,
    extras: {
      profile: {
        id: '00000000-0000-4000-8000-000000000001',
        RequestDataSiloId: '00000000-0000-4000-8000-000000000002',
        identifier: 'person@example.com',
        type: 'email',
      },
      request: buildRequest(),
      organization: buildOrganization(),
    },
  };
}

/**
 * Build a representative DSR request-enricher test payload.
 *
 * @returns JSON-compatible payload
 */
function buildEnricherPayload(): object {
  return {
    type: 'ACCESS',
    dataSubject: {
      type: 'customer',
    },
    isTest: true,
    requestIdentifier: {
      name: 'email',
      value: 'person@example.com',
    },
    extras: {
      enricher: {
        id: '00000000-0000-4000-8000-000000000003',
        title: 'Email enrichment',
      },
      identifier: {
        id: '00000000-0000-4000-8000-000000000004',
        name: 'email',
        type: 'email',
      },
      requestEnricherId: '00000000-0000-4000-8000-000000000005',
      request: buildRequest(),
      organization: buildOrganization(),
    },
  };
}

/**
 * Build deterministic request metadata shared by DSR payloads.
 *
 * @returns JSON-compatible request metadata
 */
function buildRequest(): object {
  return {
    details: '',
    id: '00000000-0000-4000-8000-000000000006',
    link: '/requests/00000000-0000-4000-8000-000000000006',
    createdAt: '2026-01-01T00:00:00.000Z',
    locale: 'en-US',
    origin: 'API',
  };
}

/**
 * Build deterministic organization metadata shared by DSR payloads.
 *
 * @returns JSON-compatible organization metadata
 */
function buildOrganization(): object {
  return {
    id: '00000000-0000-4000-8000-000000000007',
    uri: 'example',
    name: 'Example Organization',
  };
}
