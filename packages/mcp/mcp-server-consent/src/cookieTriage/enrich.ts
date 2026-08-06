import { ConsentTrackerSource } from '@transcend-io/privacy-types';

import type {
  CookieTriageBulkGroup,
  CookieTriageClassification,
  CookieTriageConfidence,
  CookieTriageItem,
  CookieTriageRawNode,
  CookieTriageSuggestion,
} from './types.js';

/** Human-readable source copy matching the triage mockup voice. */
const SOURCE_COPY: Record<string, string> = {
  [ConsentTrackerSource.Manual]: 'Manual — entered by a person, not auto-discovered by a scan.',
  [ConsentTrackerSource.Scan]:
    'Scan-discovered — found automatically via network request monitoring, not manually entered.',
  [ConsentTrackerSource.Telemetry]: 'Telemetry — observed firing in live traffic monitoring.',
};

/**
 * Formats a ConsentTrackerSource enum into the prose shown on the review card.
 *
 * @param source - Raw source value from GraphQL
 * @returns Human-readable source line
 */
export function formatSource(source: string): string {
  return SOURCE_COPY[source] ?? `Source: ${source}`;
}

/**
 * Builds the occurrences summary line for the review card.
 *
 * @param count - Raw occurrence count
 * @returns Count plus explanatory copy
 */
export function formatOccurrences(count: number): { count: number; summary: string } {
  if (count <= 0) {
    return {
      count: 0,
      summary:
        '0 occurrences — not observed firing in recent telemetry, so there is no live traffic to learn from.',
    };
  }
  const formatted = count.toLocaleString('en-US');
  return {
    count,
    summary: `${formatted} occurrence${count === 1 ? '' : 's'} — actively firing in recent telemetry, sending data regularly.`,
  };
}

/**
 * Derives purpose/service classification fields from a raw inventory node.
 *
 * @param node - Raw cookie or data-flow fields
 * @returns Classification used by the card and mutations
 */
export function deriveClassification(node: CookieTriageRawNode): CookieTriageClassification {
  return {
    purpose: node.purposeName ?? '',
    purposeSlug: node.purposeSlug ?? '',
    purposeId: node.purposeId ?? '',
    service: node.serviceTitle ?? '',
    serviceKey: node.serviceKey ?? node.serviceTitle ?? '',
  };
}

/**
 * Local suggestion heuristic (no upstream recommendation API).
 *
 * High + approve when purpose and service are both set; medium when only one is
 * set; low when neither. Always recommends approve when anything is classified.
 *
 * @param classification - Current purpose / service
 * @returns Suggested action callout
 */
export function suggestAction(classification: CookieTriageClassification): CookieTriageSuggestion {
  const hasPurpose = classification.purposeSlug !== '' || classification.purpose !== '';
  const hasService = classification.service !== '' || classification.serviceKey !== '';

  if (hasPurpose && hasService) {
    const purpose = classification.purpose || classification.purposeSlug;
    const service = classification.service || classification.serviceKey;
    return {
      confidence: 'high',
      action: 'approve',
      reasoning: `Fully specified — ${purpose} via ${service}. Recommend approve.`,
    };
  }

  if (hasPurpose || hasService) {
    const known = hasPurpose
      ? classification.purpose || classification.purposeSlug
      : classification.service || classification.serviceKey;
    return {
      confidence: 'medium',
      action: 'approve',
      reasoning: `Partially classified (${known}). Confirm purpose and service before approving.`,
    };
  }

  return {
    confidence: 'low',
    action: 'approve',
    reasoning: 'Needs classification — assign a purpose and service before approving.',
  };
}

/**
 * Whether an item is fully classified (purpose + service) at high confidence.
 *
 * @param item - Enriched triage item
 * @returns True when both purpose and service are set and confidence is high
 */
export function isHighConfidenceFullyClassified(item: CookieTriageItem): boolean {
  const { classification, suggestion } = item;
  const hasPurpose = classification.purposeSlug !== '' || classification.purpose !== '';
  const hasService = classification.service !== '' || classification.serviceKey !== '';
  return suggestion.confidence === 'high' && hasPurpose && hasService;
}

/**
 * Finds high-confidence, fully classified siblings that share the same service.
 *
 * @param item - Current item
 * @param queue - Remaining items in the same review-type queue
 * @returns Bulk group, or undefined when there are no siblings
 */
export function findBulkGroup(
  item: CookieTriageItem,
  queue: CookieTriageItem[],
): CookieTriageBulkGroup | undefined {
  const serviceKey = item.classification.serviceKey || item.classification.service;
  if (!serviceKey || !isHighConfidenceFullyClassified(item)) {
    return undefined;
  }

  const siblings = queue.filter((candidate) => {
    if (candidate.id === item.id) return false;
    const candidateKey = candidate.classification.serviceKey || candidate.classification.service;
    return candidateKey === serviceKey && isHighConfidenceFullyClassified(candidate);
  });

  if (siblings.length === 0) {
    return undefined;
  }

  return {
    siblingCount: siblings.length,
    service: item.classification.service || serviceKey,
    siblingIds: siblings.map((sibling) => sibling.id),
  };
}

/**
 * Maps a raw inventory node into a triage card item (without bulk group).
 *
 * @param node - Raw cookie or data-flow fields
 * @returns Enriched item ready for the queue
 */
export function enrichItem(node: CookieTriageRawNode): CookieTriageItem {
  const classification = deriveClassification(node);
  return {
    id: node.id,
    identifier: node.identifier,
    description: node.description?.trim() ? node.description : 'No description on file',
    source: formatSource(node.source),
    occurrences: formatOccurrences(node.occurrences),
    suggestion: suggestAction(classification),
    classification,
  };
}

/**
 * Attaches bulk-group metadata to each item based on the full queue.
 *
 * @param items - Enriched items for one review type
 * @returns Items with bulkGroup populated where applicable
 */
export function attachBulkGroups(items: CookieTriageItem[]): CookieTriageItem[] {
  return items.map((item) => {
    const bulkGroup = findBulkGroup(item, items);
    return bulkGroup ? { ...item, bulkGroup } : item;
  });
}

/**
 * Confidence → theme status mapping helper for tests and UI.
 *
 * @param confidence - Suggestion confidence
 * @returns Stable label for badges
 */
export function confidenceLabel(confidence: CookieTriageConfidence): string {
  if (confidence === 'high') return 'HIGH CONFIDENCE';
  if (confidence === 'medium') return 'MEDIUM CONFIDENCE';
  return 'LOW CONFIDENCE';
}
