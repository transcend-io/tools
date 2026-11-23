/**
 * Compute titles to add/remove when reconciling a workflow association list.
 */
export function diffTitleAssociations(
  currentTitles: string[],
  desiredTitles: string[],
): { toAdd: string[]; toRemove: string[] } {
  const current = new Set(currentTitles);
  const desired = new Set(desiredTitles);
  return {
    toAdd: desiredTitles.filter((title) => !current.has(title)),
    toRemove: currentTitles.filter((title) => !desired.has(title)),
  };
}
