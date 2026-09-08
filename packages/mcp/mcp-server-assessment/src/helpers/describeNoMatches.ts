/**
 * A note for a list that came back empty, naming the filters that were applied.
 *
 * An empty `data` array reads exactly like a failed lookup, and a cold-read
 * agent that hit one spent a second, unfiltered call re-deriving the answer by
 * hand before it would trust the zero. Saying the query succeeded, and against
 * what, is what makes the zero usable.
 *
 * @param subject - Plural noun for what was being listed, e.g. `templates`
 * @param appliedFilters - Names of the filters, as the caller passed them
 * @returns The note to attach to the empty page
 */
export function describeNoMatches(subject: string, appliedFilters: string[]): string {
  if (appliedFilters.length === 0) {
    return `This organization has no ${subject}. The query succeeded.`;
  }
  return (
    `No ${subject} match the filters applied (${appliedFilters.join(', ')}). ` +
    'The query succeeded; relax or drop a filter rather than retrying it unchanged.'
  );
}
