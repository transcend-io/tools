import { DEFAULT_DASHBOARD_URL, z } from '@transcend-io/mcp-server-base';
import {
  DashboardLinkFieldKind,
  DashboardLinkParamEncoding,
  type DashboardLinkManifest,
  type DashboardPageLink,
} from '@transcend-io/privacy-types';
import { LRUCache } from 'lru-cache';

export const DASHBOARD_LINK_MANIFEST_URL = `${DEFAULT_DASHBOARD_URL}/dashboard-link-manifest.json`;

const manifestCache = new LRUCache<string, DashboardLinkManifest>({
  max: 1,
  ttl: 60 * 60 * 1000,
});

const FieldDefSchema = z.object({
  kind: z.enum(Object.values(DashboardLinkFieldKind) as [string, ...string[]]),
  encoding: z.enum(Object.values(DashboardLinkParamEncoding) as [string, ...string[]]).optional(),
  values: z.array(z.string()).optional(),
  model: z.string().optional(),
  multiple: z.boolean().optional(),
  description: z.string().optional(),
});

const PageSchema = z.object({
  route: z.string(),
  title: z.string(),
  filters: z.record(z.string(), FieldDefSchema).optional(),
  params: z.record(z.string(), FieldDefSchema).optional(),
  sort: z.boolean().optional(),
  pagination: z.boolean().optional(),
});

const ManifestSchema = z.object({
  version: z.number(),
  commit: z.string().optional(),
  origin: z.string().url(),
  pages: z.array(PageSchema),
});

/**
 * Load dashboard-link-manifest.json from app.transcend.io.
 *
 * @returns Parsed manifest, or undefined when missing or not JSON
 */
export async function getDashboardLinkManifest(): Promise<DashboardLinkManifest | undefined> {
  const cached = manifestCache.get('manifest');
  if (cached) {
    return cached;
  }
  const response = await fetch(DASHBOARD_LINK_MANIFEST_URL);
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !contentType.includes('application/json')) {
    return undefined;
  }
  const parsed = ManifestSchema.safeParse(await response.json());
  if (!parsed.success) {
    return undefined;
  }
  const manifest = parsed.data as DashboardLinkManifest;
  manifestCache.set('manifest', manifest);
  return manifest;
}

/** Clear manifest cache in tests. */
export function resetDashboardLinkManifestCacheForTests(): void {
  manifestCache.clear();
}

/**
 * Find one page entry by route path or pattern.
 *
 * @returns Matching manifest row, or undefined
 */
export function findManifestPage(
  manifest: DashboardLinkManifest,
  /** Normalized route path */
  route: string,
): DashboardPageLink | undefined {
  return manifest.pages.find((page) => page.route === route || route.startsWith(`${page.route}/`));
}

export type { DashboardPageLink };
