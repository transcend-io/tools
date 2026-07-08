export interface ResolvedAnalyticsDateRange {
  /** Start time as epoch seconds */
  startEpoch: number;
  /** End time as epoch seconds */
  endEpoch: number;
  /** Start time as ISO string (for legacy analyticsData API) */
  startIso: string;
  /** End time as ISO string (for legacy analyticsData API) */
  endIso: string;
}

/**
 * Resolve a date range from explicit ISO timestamps or a lookback window.
 */
export function resolveAnalyticsDateRange(args: {
  /** Explicit start datetime (ISO 8601) */
  start?: string;
  /** Explicit end datetime (ISO 8601) */
  end?: string;
  /** Lookback window in days when start is omitted (default 7) */
  days?: number;
}): ResolvedAnalyticsDateRange {
  const endDate = args.end ? new Date(args.end) : new Date();
  const lookbackDays = args.days ?? 7;
  const startDate = args.start
    ? new Date(args.start)
    : new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid start or end date');
  }
  if (startDate > endDate) {
    throw new Error('Start date must be before end date');
  }

  return {
    startEpoch: Math.floor(startDate.getTime() / 1000),
    endEpoch: Math.floor(endDate.getTime() / 1000),
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  };
}
