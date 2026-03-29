/**
 * Split a comma-separated string into a trimmed, non-empty list.
 *
 * Handles double commas and surrounding spaces:
 *   "Dog, Cat"  → ['Dog', 'Cat']
 *   "Dog,,Cat"  → ['Dog', 'Cat']
 *
 * @param value - Comma-separated string
 * @returns List of trimmed, non-empty values
 */
export function splitCsvToList(value: string): string[] {
  return value
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x);
}
