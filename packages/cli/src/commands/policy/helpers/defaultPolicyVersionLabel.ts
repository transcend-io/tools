/**
 * Formats a date as `yyyy-mm-dd-hh-mm-ss` in UTC.
 *
 * @param date - Date to format
 * @returns Timestamp label
 */
function formatPolicyVersionTimestamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join('-');
}

/**
 * Returns a default version label from the bundle name and current UTC timestamp.
 *
 * @param bundleName - Tenant-unique policy bundle name
 * @param now - Current time (for testing)
 * @returns Version label in `{bundleName}-yyyy-mm-dd-hh-mm-ss` form
 */
export function defaultPolicyVersionLabel(bundleName: string, now: Date = new Date()): string {
  return `${bundleName}-${formatPolicyVersionTimestamp(now)}`;
}
