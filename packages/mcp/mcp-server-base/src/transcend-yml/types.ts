import type { CollectedLog } from '../helpers/collectingLogger.js';

/** One failed row in a section write tool result. */
export interface SectionWriteError {
  /** Yaml section name */
  resource: string;
  /** Item key when the sync named one */
  item?: string;
  /** Error text */
  message: string;
}

/** Compact result of a transcend.yml section write tool. */
export interface SectionWriteResult {
  /** Whether every item synced without error */
  success: boolean;
  /** Number of items sent */
  count: number;
  /** Per-resource errors from the SDK sync */
  errors: SectionWriteError[];
  /** Non-fatal warnings */
  warnings?: string[];
  /** Log lines, usually only on failure */
  logs?: CollectedLog[];
}

/** Options for {@link pushYmlSection}. */
export interface PushYmlSectionOptions {
  /** Publish privacy center changes after the push */
  publishToPrivacyCenter?: boolean;
  /** Run service classification on data silos during the push */
  classifyService?: boolean;
}

/** Options for {@link listYmlSection}. */
export interface ListYmlSectionOptions {
  /** Rows to skip before the page */
  offset?: number;
  /** Page size */
  limit?: number;
  /** Keep only rows that pass this filter */
  filter?: (item: unknown) => boolean;
}

/** Options for {@link decodeYmlItems}. */
export interface DecodeYmlItemsOptions<T> {
  /** Build a key per decoded item; duplicates fail validation */
  uniqueBy?: (item: T) => string;
}
