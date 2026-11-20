import { createHash } from 'node:crypto';

import { getRequestAuth, z } from '@transcend-io/mcp-server-base';
import { DocsAccess, parseDocsGuideType } from '@transcend-io/privacy-types';
import { LRUCache } from 'lru-cache';

import type { DashboardRouteData } from './docsRoutes.js';
import { clearSearchIndexCache } from './docsSearch.js';

/** Public docs index URL (llms.txt). */
export const LLMS_TXT_URL = 'https://docs.transcend.io/llms.txt';

/** Admin Dashboard route to docs pages index. */
export const DASHBOARD_ROUTES_URL = 'https://docs.transcend.io/dashboard-routes.json';

/** Allowed hostname for fetched documentation articles. */
export const DOCS_HOST = 'docs.transcend.io';

/** Origin that relative article URLs in llms.txt resolve against. */
const DOCS_ORIGIN = `https://${DOCS_HOST}`;

const INDEX_CACHE_KEY = 'index';
const ROUTES_CACHE_KEY = 'routes';
const DEFAULT_INDEX_TTL_MS = 24 * 60 * 60 * 1000;
/** The route index is small and changes on each docs deploy, so it refreshes hourly. */
const ROUTE_INDEX_TTL_MS = 60 * 60 * 1000;
const DEFAULT_BODY_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_CACHE_ENTRIES = 600;
/** Signed-in callers each get their own index entries, so keep room for a few tokens. */
const MAX_TIER_INDEX_ENTRIES = 20;

/** Env var holding a docs.transcend.io bearer token for stdio use. */
export const DOCS_TOKEN_ENV = 'TRANSCEND_DOCS_TOKEN';

/** Cache tier key shared by every caller without a docs token. */
export const PUBLIC_TIER_KEY = 'public';

/** Response header the docs site sets to the page's {@link DocsAccess}. */
const ACCESS_HEADER = 'x-docs-access';
/** Response header the docs site sets to `true` when the body is a public preview. */
const PREVIEW_HEADER = 'x-docs-preview';

/**
 * Who a docs request is made as. Public requests share one cache. Each signed-in token
 * gets its own, so gated content never reaches a caller with a different token.
 */
export interface DocsTier {
  /** `public`, or `signedIn:` plus a hash of the token. Never the token itself. */
  key: string;
  /** Bearer token to send to docs.transcend.io. Absent for the public tier. */
  token?: string;
}

/**
 * Resolves the docs tier for the current call. The per-request auth from
 * {@link getRequestAuth} wins, so an HTTP server never mixes in its own env token.
 * Session cookies carry no bearer token, so they fall through to {@link DOCS_TOKEN_ENV}.
 */
export function resolveDocsTier(): DocsTier {
  const auth = getRequestAuth();
  let token: string | undefined;
  if (auth?.type === 'apiKey') {
    token = auth.apiKey;
  } else if (auth?.type === 'oauthToken') {
    token = auth.accessToken;
  }
  token = token?.trim() || process.env[DOCS_TOKEN_ENV]?.trim() || undefined;
  if (!token) {
    return { key: PUBLIC_TIER_KEY };
  }
  return {
    key: `signedIn:${createHash('sha256').update(token).digest('hex').slice(0, 32)}`,
    token,
  };
}

/** A single article entry from llms.txt. */
export interface DocEntry {
  /** Section header from llms.txt (e.g. "General", "Use Case Guides"). */
  section: string;
  /** Human-readable article title. */
  title: string;
  /** Absolute URL to the article markdown (.md). */
  url: string;
  /** One-line summary from llms.txt. Absent in the older `## Section` layout. */
  description?: string;
  /** Who may read the full page. A page with no marker in llms.txt is signed-in only. */
  access: DocsAccess;
}

/** Section for a top-level link that sits outside every group (the docs home, the changelog). */
const DEFAULT_SECTION = 'General';

const SECTION_HEADER = /^## (.+)$/;
const LIST_LINK = /^(\s*)- \[(.*?)\]\(([^)\s]+)\)(?::\s(.*))?\s*$/;
const LIST_LABEL = /^(\s*)- ([^[\s].*)$/;
/** Optional trailing `{access: public}` marker the docs site adds to a page's line. */
const ACCESS_MARKER = /\s*\{access:\s*(public|signedIn)\}\s*$/;

/**
 * Parses llms.txt markdown into structured entries.
 *
 * Two layouts are supported:
 * - The current one: top-level `- Group` bullets with `- [Title](/path): description`
 *   links nested under them at any depth. The top-level label is the section.
 * - The older one: `## Section` headers followed by `- [Title](url)` items.
 *
 * A line may end with `{access: public}` or `{access: signedIn}`. Without one the page is
 * signed-in only, matching the docs frontmatter default.
 *
 * Relative URLs resolve against {@link DOCS_ORIGIN}. A top-level link outside any
 * group goes in the `General` section, or in the active `##` section when there is one.
 * Throws when the input has content but yields no articles, since an empty index would
 * otherwise look like "no such docs" instead of a format change.
 */
export function parseLlmsTxt(raw: string): DocEntry[] {
  const entries: DocEntry[] = [];
  const seenUrls = new Set<string>();
  let headerSection = '';
  let groupLabel = '';

  for (const rawLine of raw.split('\n')) {
    const marker = ACCESS_MARKER.exec(rawLine);
    const access = marker?.[1] === DocsAccess.Public ? DocsAccess.Public : DocsAccess.SignedIn;
    const line = marker ? rawLine.slice(0, marker.index) : rawLine;
    const header = SECTION_HEADER.exec(line);
    if (header?.[1]) {
      headerSection = header[1].trim();
      groupLabel = '';
      continue;
    }

    const link = LIST_LINK.exec(line);
    if (link) {
      const [, indent = '', rawTitle = '', rawUrl = '', rawDescription = ''] = link;
      const title = rawTitle.trim();
      if (!title) {
        continue;
      }
      const section =
        indent.length === 0
          ? headerSection || DEFAULT_SECTION
          : groupLabel || headerSection || DEFAULT_SECTION;
      const url = resolveDocsUrl(rawUrl);
      // The search index keys documents by URL, and a page listed under two groups
      // would make it throw. Keep the first listing.
      if (seenUrls.has(url)) {
        continue;
      }
      seenUrls.add(url);
      const description = rawDescription.trim();
      entries.push({ section, title, url, access, ...(description && { description }) });
      continue;
    }

    const label = LIST_LABEL.exec(line);
    if (label?.[1] === '' && label[2]) {
      // A bare bullet at the top level starts a group, such as `- Privacy Center`.
      groupLabel = label[2].replace(/\*\*/g, '').trim();
    }
  }

  if (entries.length === 0 && raw.trim() !== '') {
    throw new Error(
      'llms.txt has content but no article links were recognized, so the format may have changed',
    );
  }
  return entries;
}

function resolveDocsUrl(url: string): string {
  try {
    return new URL(url.trim(), DOCS_ORIGIN).toString();
  } catch {
    return url.trim();
  }
}

const RoutePageSchema = z.object({
  title: z.string(),
  url: z.string(),
  guideType: z
    .string()
    .nullish()
    .transform((value) => parseDocsGuideType(value)),
});

const RouteEntrySchema = z.object({
  product: z.string().nullish(),
  primary: z.array(RoutePageSchema).default([]),
  mentions: z.array(RoutePageSchema).default([]),
});

/** Schema for dashboard-routes.json. */
export const DashboardRoutesSchema = z.object({
  routes: z.record(z.string(), RouteEntrySchema),
  // Product fields are optional so an older index with only `routes` still parses.
  products: z.record(z.string(), z.array(RoutePageSchema)).optional(),
  productPrefixes: z
    .array(z.object({ prefix: z.string(), product: z.string().nullable() }))
    .optional(),
  integrations: z.record(z.string(), z.array(RoutePageSchema)).optional(),
});

/** Parses and validates dashboard-routes.json. Throws when the shape is invalid. */
export function parseDashboardRoutes(raw: string): DashboardRouteData {
  return DashboardRoutesSchema.parse(JSON.parse(raw));
}

/** Short reason for an index failure. A zod error message is a JSON dump, so use its first issue. */
function describeCause(cause: unknown): string {
  if (cause instanceof z.ZodError) {
    const issue = cause.issues[0];
    return `invalid shape at ${issue?.path.join('.') || 'root'}: ${issue?.message ?? 'unknown'}`;
  }
  return cause instanceof Error ? cause.message : String(cause);
}

/** Thrown when dashboard-routes.json cannot be fetched or is invalid. */
export class RouteIndexUnavailableError extends Error {
  constructor(cause: unknown) {
    super(`The Admin Dashboard route index is not available: ${describeCause(cause)}`, { cause });
    this.name = 'RouteIndexUnavailableError';
  }
}

interface DocsFetchOptions {
  signal?: AbortSignal;
  accept?: string;
  token?: string;
}

/** Parsed docs response: the text plus what the docs site said about access. */
interface DocsResponse {
  text: string;
  /** From the `X-Docs-Access` header, when present and valid. */
  access?: DocsAccess;
  /** True when the `X-Docs-Preview` header is `true`. */
  preview: boolean;
}

function parseAccessHeader(value: string | null): DocsAccess | undefined {
  return value === DocsAccess.Public || value === DocsAccess.SignedIn ? value : undefined;
}

async function fetchDocs(
  url: string,
  { signal, accept = 'text/markdown, text/plain', token }: DocsFetchOptions,
): Promise<DocsResponse> {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      // Only docs.transcend.io URLs reach here, so the token never goes to another host.
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    signal: signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    if (token && (response.status === 401 || response.status === 403)) {
      throw new Error(
        `Failed to fetch ${url}: HTTP ${response.status}. docs.transcend.io rejected the docs ` +
          `token. Check ${DOCS_TOKEN_ENV} or sign in again.`,
      );
    }
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  const access = parseAccessHeader(response.headers.get(ACCESS_HEADER));
  return {
    text: await response.text(),
    ...(access && { access }),
    preview: response.headers.get(PREVIEW_HEADER) === 'true',
  };
}

async function fetchText(url: string, options: DocsFetchOptions): Promise<string> {
  return (await fetchDocs(url, options)).text;
}

const indexCache = new LRUCache<string, DocEntry[], DocsTier>({
  max: MAX_TIER_INDEX_ENTRIES,
  ttl: DEFAULT_INDEX_TTL_MS,
  allowStale: true,
  allowStaleOnFetchRejection: true,
  fetchMethod: async (_key, _stale, { signal, context }) => {
    const raw = await fetchText(LLMS_TXT_URL, { signal, token: context.token });
    return parseLlmsTxt(raw);
  },
});

/** Cause of the most recent failed route index fetch, cleared on success. */
let lastRouteIndexError: unknown;

const routeIndexCache = new LRUCache<string, DashboardRouteData, DocsTier>({
  max: MAX_TIER_INDEX_ENTRIES,
  ttl: ROUTE_INDEX_TTL_MS,
  allowStale: true,
  allowStaleOnFetchRejection: true,
  fetchMethod: async (_key, _stale, { signal, context }) => {
    try {
      const raw = await fetchText(DASHBOARD_ROUTES_URL, {
        signal,
        accept: 'application/json',
        token: context.token,
      });
      const parsed = parseDashboardRoutes(raw);
      lastRouteIndexError = undefined;
      return parsed;
    } catch (error) {
      // `allowStaleOnFetchRejection` swallows the rejection when nothing is cached, so
      // keep the cause for getRouteIndex to report.
      lastRouteIndexError = error;
      throw error;
    }
  },
});

/** A fetched article body. */
export interface DocBody {
  /** Article markdown. */
  markdown: string;
  /** The page's access, when the docs site reported it. */
  access?: DocsAccess;
  /** True when the docs site returned a public preview instead of the full article. */
  preview: boolean;
}

/** Per-call input for {@link bodyCache}, plus the cause of a failed fetch. */
interface BodyFetchContext {
  url: string;
  tier: DocsTier;
  /** Set when the fetch fails, because `allowStaleOnFetchRejection` hides the rejection. */
  failure?: unknown;
}

/**
 * Article bodies, keyed by tier then URL. The public tier is one shared set of entries.
 * A signed-in token's entries are only ever read back by the same token.
 */
const bodyCache = new LRUCache<string, DocBody, BodyFetchContext>({
  max: MAX_BODY_CACHE_ENTRIES,
  ttl: DEFAULT_BODY_TTL_MS,
  allowStale: true,
  allowStaleOnFetchRejection: true,
  fetchMethod: async (_key, _stale, { signal, context }) => {
    try {
      const { text, access, preview } = await fetchDocs(context.url, {
        signal,
        token: context.tier.token,
      });
      return { markdown: text, ...(access && { access }), preview };
    } catch (error) {
      context.failure = error;
      throw error;
    }
  },
});

/** Returns the parsed llms.txt index (cached with TTL). */
export async function getIndex(): Promise<DocEntry[]> {
  const tier = resolveDocsTier();
  const result = await indexCache.fetch(`${tier.key}:${INDEX_CACHE_KEY}`, { context: tier });
  if (!result) {
    throw new Error('Failed to load documentation index');
  }
  return result;
}

/**
 * Returns the parsed dashboard-routes.json index (cached with TTL).
 * Throws {@link RouteIndexUnavailableError} when it is missing or invalid.
 */
export async function getRouteIndex(): Promise<DashboardRouteData> {
  let result: DashboardRouteData | undefined;
  const tier = resolveDocsTier();
  try {
    result = await routeIndexCache.fetch(`${tier.key}:${ROUTES_CACHE_KEY}`, { context: tier });
  } catch (error) {
    throw new RouteIndexUnavailableError(error);
  }
  if (!result) {
    throw new RouteIndexUnavailableError(lastRouteIndexError ?? 'empty response');
  }
  return result;
}

/**
 * Fetches and caches an article for the current tier, with the access the docs site
 * reported and whether the body is a signed-out preview.
 */
export async function getDoc(url: string): Promise<DocBody> {
  assertDocsHost(url);
  const tier = resolveDocsTier();
  const context: BodyFetchContext = { url, tier };
  const result = await bodyCache.fetch(`${tier.key}|${url}`, { context });
  if (result === undefined) {
    throw context.failure instanceof Error
      ? context.failure
      : new Error(`Failed to fetch documentation: ${url}`);
  }
  return result;
}

/** Fetches and caches the markdown body for a docs.transcend.io article URL. */
export async function getBody(url: string): Promise<string> {
  return (await getDoc(url)).markdown;
}

/** Validates that a URL targets docs.transcend.io (SSRF guard for fetch). */
export function assertDocsHost(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid documentation URL: ${url}`);
  }
  if (parsed.hostname !== DOCS_HOST) {
    throw new Error(`URL host must be ${DOCS_HOST}, got ${parsed.hostname}`);
  }
}

/** Clears in-memory caches (for tests). */
export function resetDocsCachesForTests(): void {
  indexCache.clear();
  routeIndexCache.clear();
  lastRouteIndexError = undefined;
  bodyCache.clear();
  clearSearchIndexCache();
}
