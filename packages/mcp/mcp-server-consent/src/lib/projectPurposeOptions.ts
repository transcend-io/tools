import type { CookieTriagePurposeOption } from './cookieTriageTypes.js';
import { isUnknownCookiePurposeSlug } from './resolvePrimaryCookiePurpose.js';

/** Compact purpose node fields used from `consent_list_purposes`. */
export interface ConsentPurposeListNode {
  /** Purpose slug used when assigning tracking purposes */
  trackingType?: string;
  /** Dashboard display name */
  name?: string;
  /** Localized title when present */
  title?: string | null;
  /** Whether the purpose is currently active */
  isActive?: boolean;
  /** Soft-deletion timestamp; null when active */
  deletedAt?: string | null;
  /** Display ordering weight */
  displayOrder?: number;
}

/**
 * Project `consent_list_purposes` nodes into select options for the triage UI.
 *
 * Drops inactive / deleted purposes and the Unknown purpose (not assignable via the
 * multi-select), then sorts by displayOrder then label.
 */
export function projectPurposeOptions(
  nodes: readonly ConsentPurposeListNode[],
): CookieTriagePurposeOption[] {
  const options: {
    /** Purpose option for the select */
    option: CookieTriagePurposeOption;
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
    const label = (node.title?.trim() || node.name?.trim() || slug).trim();
    options.push({
      option: { slug, label },
      displayOrder: node.displayOrder ?? Number.MAX_SAFE_INTEGER,
    });
  }

  options.sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }
    return left.option.label.localeCompare(right.option.label);
  });

  return options.map((entry) => entry.option);
}
