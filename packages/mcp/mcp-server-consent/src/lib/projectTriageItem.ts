import type { ConsentTriageType, CookieTriageAnalysis } from './cookieTriageTypes.js';

/** Structural cookie/data-flow list node the triage view can project without SDK imports. */
export interface ConsentTriageListNode {
  /** Transcend cookie or data-flow ID */
  id?: string;
  /** Cookie name when the node is a cookie */
  name?: string;
  /** Data-flow value (URL/host) when the node is a data flow */
  value?: string;
  /** Associated service when known */
  service?: {
    /** Service or vendor display title */
    title?: string;
  };
  /** Cookie tracking purpose slugs */
  trackingPurposes?: string[];
  /** Data-flow tracking purpose slugs */
  trackingType?: string[];
  /** Telemetry occurrence count */
  occurrences?: number;
  /** ISO 8601 timestamp when the item was last seen in telemetry */
  lastDiscoveredAt?: string;
}

/** Project a cookie list node into the slim triage row shape. */
export function projectCookieForTriage(cookie: ConsentTriageListNode): CookieTriageAnalysis {
  if (cookie.name === undefined || cookie.name.length === 0) {
    throw new Error('Cookie list node is missing a name');
  }

  return {
    name: cookie.name,
    ...(cookie.id ? { id: cookie.id } : {}),
    ...(cookie.service?.title ? { service: cookie.service.title } : {}),
    ...(cookie.trackingPurposes ? { trackingPurposes: cookie.trackingPurposes } : {}),
    ...(cookie.occurrences !== undefined ? { occurrences: cookie.occurrences } : {}),
    ...(cookie.lastDiscoveredAt ? { lastActivityAt: cookie.lastDiscoveredAt } : {}),
  };
}

/** Project a data-flow list node into the slim triage row shape. */
export function projectDataFlowForTriage(flow: ConsentTriageListNode): CookieTriageAnalysis {
  if (flow.value === undefined || flow.value.length === 0) {
    throw new Error('Data-flow list node is missing a value');
  }

  return {
    name: flow.value,
    ...(flow.id ? { id: flow.id } : {}),
    ...(flow.service?.title ? { service: flow.service.title } : {}),
    ...(flow.trackingType ? { trackingPurposes: flow.trackingType } : {}),
    ...(flow.occurrences !== undefined ? { occurrences: flow.occurrences } : {}),
    ...(flow.lastDiscoveredAt ? { lastActivityAt: flow.lastDiscoveredAt } : {}),
  };
}

/** Project an unknown list-tool row, or `undefined` when it cannot be shown. */
export function projectListNodeForTriage(
  triageType: ConsentTriageType,
  node: unknown,
): CookieTriageAnalysis | undefined {
  const shaped = asListNode(node);
  if (!shaped) {
    return undefined;
  }

  try {
    return triageType === 'cookies'
      ? projectCookieForTriage(shaped)
      : projectDataFlowForTriage(shaped);
  } catch {
    return undefined;
  }
}

function asListNode(node: unknown): ConsentTriageListNode | undefined {
  if (node === null || typeof node !== 'object') {
    return undefined;
  }

  const record = node as Record<string, unknown>;
  const service = asService(record.service);

  return {
    ...(asNonEmptyString(record.id) ? { id: asNonEmptyString(record.id) } : {}),
    ...(asNonEmptyString(record.name) ? { name: asNonEmptyString(record.name) } : {}),
    ...(asNonEmptyString(record.value) ? { value: asNonEmptyString(record.value) } : {}),
    ...(service ? { service } : {}),
    ...(asStringArray(record.trackingPurposes)
      ? { trackingPurposes: asStringArray(record.trackingPurposes) }
      : {}),
    ...(asStringArray(record.trackingType)
      ? { trackingType: asStringArray(record.trackingType) }
      : {}),
    ...(typeof record.occurrences === 'number' && Number.isFinite(record.occurrences)
      ? { occurrences: record.occurrences }
      : {}),
    ...(asNonEmptyString(record.lastDiscoveredAt)
      ? { lastDiscoveredAt: asNonEmptyString(record.lastDiscoveredAt) }
      : {}),
  };
}

function asService(value: unknown): ConsentTriageListNode['service'] | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const title = asNonEmptyString((value as { title?: unknown }).title);
  return title ? { title } : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value.filter((item): item is string => typeof item === 'string');
  return strings.length > 0 ? strings : undefined;
}
