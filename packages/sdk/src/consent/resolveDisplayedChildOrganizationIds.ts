/**
 * Resolve displayed child organization URIs or IDs to organization IDs.
 *
 * Each value may be either an organization ID or URI. IDs are matched first,
 * then URIs. Throws if any value cannot be resolved.
 *
 * @param childOrganizations - Child organizations available on the privacy center
 * @param urisOrIds - URIs and/or IDs from transcend.yml
 * @returns Resolved organization IDs (same order as input)
 */
export function resolveDisplayedChildOrganizationIds(
  childOrganizations: Array<{
    /** Organization ID */
    id: string;
    /** Organization URI */
    uri: string;
  }>,
  urisOrIds: string[],
): string[] {
  return urisOrIds.map((value) => {
    const byId = childOrganizations.find((child) => child.id === value);
    if (byId) {
      return byId.id;
    }
    const byUri = childOrganizations.find((child) => child.uri === value);
    if (byUri) {
      return byUri.id;
    }
    const available =
      childOrganizations.length > 0
        ? childOrganizations.map((child) => `${child.uri} (${child.id})`).join(', ')
        : '(none)';
    throw new Error(
      `Failed to resolve displayed child organization URI or ID: "${value}". Available: ${available}`,
    );
  });
}
