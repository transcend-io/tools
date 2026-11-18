/** A docs page linked to an Admin Dashboard route. */
export interface RoutePage {
  /** Human-readable article title. */
  title: string;
  /** Absolute URL to the article. */
  url: string;
  /** Guide type label, or null when the page has none. */
  guideType: string | null;
}

/** Pages linked to one Admin Dashboard route pattern. */
export interface RouteEntry {
  /** Product title the route belongs to, or null for a platform route. Absent on older indexes. */
  product?: string | null;
  /** Pages that are about the route. */
  primary: RoutePage[];
  /** Pages that only link to the route. */
  mentions: RoutePage[];
}

/** Parsed dashboard-routes.json: route pattern to linked pages. */
export type RouteIndex = Record<string, RouteEntry>;

/** Product title to its docs pages, overview pages first. */
export type ProductIndex = Record<string, RoutePage[]>;

/** Route path prefix mapped to a product title (null for platform routes). */
export interface ProductPrefix {
  /** Path prefix such as `/privacy-center`. */
  prefix: string;
  /** Product title, or null when the prefix is a platform area with no product. */
  product: string | null;
}

/** Parsed dashboard-routes.json. Product fields are absent on older indexes. */
export interface DashboardRouteData {
  /** Route pattern to linked pages. */
  routes: RouteIndex;
  /** Product title to pages. Absent on older indexes. */
  products?: ProductIndex;
  /** Path prefixes to products. Absent on older indexes. */
  productPrefixes?: ProductPrefix[];
}

/** Product titles published in dashboard-routes.json. */
export enum DashboardDocsProduct {
  DataInventory = 'Data Inventory',
  SystemDiscovery = 'System Discovery',
  Classification = 'Classification',
  DsrAutomation = 'DSR Automation',
  ConsentManagement = 'Consent Management',
  PreferenceManagement = 'Preference Management',
  PrivacyCenter = 'Privacy Center',
  WebAuditor = 'Web Auditor',
  Assessments = 'Assessments',
  Platform = 'Platform',
}

/** One docs page returned for a route lookup. */
export interface RouteMatchPage extends RoutePage {
  /** Whether the page is about the route or only links to it. */
  match: 'primary' | 'mention';
  /** The route pattern that produced this page. */
  route: string;
}

/** Result of resolving an input to a route pattern and its pages. */
export interface RouteLookup {
  /** The normalized path that was looked up. */
  path: string;
  /** The matched route pattern. */
  pattern: string;
  /** True when the match is a parent of the requested path, not the path itself. */
  isParentFallback: boolean;
  /** Primary pages first, then mentions. */
  pages: RouteMatchPage[];
}

const APP_HOST_PATTERN = /^app(\.[a-z0-9-]+)*\.transcend\.io$/i;

/**
 * Normalizes a route pattern, concrete path, or full app URL to a path with a
 * leading slash and no origin, query, hash, or trailing slash.
 * Returns `/` for the root. Throws when a URL is not an `app.*transcend.io` URL.
 */
export function normalizeRoute(input: string): string {
  let value = input.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`Invalid URL: ${input}`);
    }
    if (!APP_HOST_PATTERN.test(parsed.hostname)) {
      throw new Error(
        `URL host must be an app.transcend.io dashboard host, got ${parsed.hostname}`,
      );
    }
    value = parsed.pathname;
  } else {
    value = value.split('#')[0]!.split('?')[0]!;
  }
  const segments = value.split('/').filter(Boolean);
  return `/${segments.join('/')}`;
}

function splitSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

function isParam(segment: string): boolean {
  return segment.startsWith(':') && segment.length > 1;
}

function isOptionalParam(segment: string): boolean {
  return isParam(segment) && segment.endsWith('?');
}

/**
 * Whether a route pattern matches a concrete path.
 * `:name` matches exactly one segment. `:name?` matches zero or one trailing segment.
 */
export function patternMatchesPath(pattern: string, path: string): boolean {
  const patternSegments = splitSegments(pattern);
  const pathSegments = splitSegments(path);
  const last = patternSegments.at(-1);
  const hasOptionalTail = last !== undefined && isOptionalParam(last);
  const requiredLength = hasOptionalTail ? patternSegments.length - 1 : patternSegments.length;

  if (pathSegments.length < requiredLength) {
    return false;
  }
  if (pathSegments.length > patternSegments.length) {
    return false;
  }
  if (!hasOptionalTail && pathSegments.length !== patternSegments.length) {
    return false;
  }

  return pathSegments.every((segment, index) => {
    const part = patternSegments[index]!;
    return isParam(part) || part === segment;
  });
}

function literalCount(pattern: string): number {
  return splitSegments(pattern).filter((segment) => !isParam(segment)).length;
}

/** Orders patterns: most literal segments first, then most segments, then no optional tail. */
function compareSpecificity(a: string, b: string): number {
  const literalDiff = literalCount(b) - literalCount(a);
  if (literalDiff !== 0) {
    return literalDiff;
  }
  const lengthDiff = splitSegments(b).length - splitSegments(a).length;
  if (lengthDiff !== 0) {
    return lengthDiff;
  }
  const optionalDiff =
    Number(isOptionalParam(splitSegments(a).at(-1) ?? '')) -
    Number(isOptionalParam(splitSegments(b).at(-1) ?? ''));
  if (optionalDiff !== 0) {
    return optionalDiff;
  }
  return a.localeCompare(b);
}

function toPages(pattern: string, entry: RouteEntry): RouteMatchPage[] {
  return [
    ...entry.primary.map((page) => ({ ...page, match: 'primary' as const, route: pattern })),
    ...entry.mentions.map((page) => ({ ...page, match: 'mention' as const, route: pattern })),
  ];
}

function hasPages(entry: RouteEntry): boolean {
  return entry.primary.length > 0 || entry.mentions.length > 0;
}

function findBestPattern(index: RouteIndex, path: string): string | undefined {
  if (Object.hasOwn(index, path) && hasPages(index[path]!)) {
    return path;
  }
  return Object.keys(index)
    .filter((pattern) => hasPages(index[pattern]!) && patternMatchesPath(pattern, path))
    .sort(compareSpecificity)[0];
}

/**
 * Resolves a route pattern, concrete path, or app URL to the docs pages for the
 * best matching route pattern. Prefers the pattern with the most literal
 * segments. When nothing matches, retries with each parent path, longest first.
 * Returns undefined when no pattern with pages matches. Patterns with no pages
 * are skipped.
 */
export function lookupRoute(index: RouteIndex, input: string): RouteLookup | undefined {
  const path = normalizeRoute(input);
  const segments = splitSegments(path);

  // The root is a valid lookup but never a parent fallback: it would match everything.
  for (let length = segments.length; length >= Math.min(1, segments.length); length -= 1) {
    const candidate = length === 0 ? '/' : `/${segments.slice(0, length).join('/')}`;
    const pattern = findBestPattern(index, candidate);
    if (pattern !== undefined) {
      return {
        path,
        pattern,
        isParentFallback: length < segments.length,
        pages: toPages(pattern, index[pattern]!),
      };
    }
  }
  return undefined;
}

/** Finds the published product title for a user-supplied value, ignoring case. */
export function findProductTitle(input: string): DashboardDocsProduct | undefined {
  const wanted = input.trim().toLowerCase();
  return Object.values(DashboardDocsProduct).find((title) => title.toLowerCase() === wanted);
}

/** Finds the key of `products` that equals `title`, ignoring case. */
export function findProductKey(products: ProductIndex, title: string): string | undefined {
  const wanted = title.toLowerCase();
  return Object.keys(products).find((key) => key.toLowerCase() === wanted);
}

function pathHasPrefix(path: string, prefix: string): boolean {
  const normalized = normalizeRoute(prefix);
  return normalized === '/' || path === normalized || path.startsWith(`${normalized}/`);
}

/**
 * Resolves the product for a route. Uses the matched route entry's product when
 * it has one, else the longest `productPrefixes` prefix that contains the path.
 * Returns undefined for a platform route or when the index has no product fields.
 */
export function resolveRouteProduct(
  data: DashboardRouteData,
  path: string,
  lookup?: RouteLookup,
): string | undefined {
  const entryProduct = lookup ? data.routes[lookup.pattern]?.product : undefined;
  if (entryProduct) {
    return entryProduct;
  }
  const prefix = [...(data.productPrefixes ?? [])]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((candidate) => pathHasPrefix(path, candidate.prefix));
  return prefix?.product ?? undefined;
}

/**
 * Normalizes a docs URL for comparison: path only, lowercase, no `.md`, no
 * trailing slash. The route index uses extensionless URLs, llms.txt uses `.md`.
 */
export function normalizeDocUrl(url: string): string {
  let pathname: string;
  try {
    pathname = new URL(url, 'https://docs.transcend.io').pathname;
  } catch {
    pathname = url;
  }
  return pathname.replace(/\.md$/i, '').replace(/\/+$/, '').toLowerCase();
}
