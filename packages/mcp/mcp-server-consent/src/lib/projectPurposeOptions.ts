import { isUnknownCookiePurposeSlug } from './resolvePrimaryCookiePurpose.js';

/** Compact purpose node fields used from `consent_list_purposes`. */
export interface ConsentPurposeListNode {
  /** Purpose slug used when assigning tracking purposes */
  trackingType?: string;
  /** Whether the purpose is currently active */
  isActive?: boolean;
  /** Soft-deletion timestamp; null when active */
  deletedAt?: string | null;
  /** Display ordering weight */
  displayOrder?: number;
}

/**
 * Project `consent_list_purposes` nodes into selectable purpose slugs for the triage UI.
 *
 * Drops inactive / deleted purposes and the Unknown purpose (not assignable via the
 * multi-select), then sorts by displayOrder then slug.
 */
export function projectPurposeOptions(nodes: readonly ConsentPurposeListNode[]): string[] {
  const options: {
    /** Purpose slug for the select */
    slug: string;
    /** Sort weight from the API */
    displayOrder: number;
  }[] = [];

  for (const node of nodes) {
    if (node.isActive === false || node.deletedAt) {
      continue;
    }
    const slug = node.trackingType?.trim();
    if (!slug || isUnknownCookiePurposeSlug(slug)) {
      continue;
    }
    options.push({
      slug,
      displayOrder: node.displayOrder ?? Number.MAX_SAFE_INTEGER,
    });
  }

  options.sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }
    return left.slug.localeCompare(right.slug);
  });

  return options.map((entry) => entry.slug);
}
