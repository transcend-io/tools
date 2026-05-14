import type { AssessmentStatus } from '@transcend-io/mcp-server-base';

/**
 * Inputs to {@link buildAssessmentLinks}.
 */
export interface BuildAssessmentLinksInput {
  /** Base admin-dashboard URL (e.g. `https://app.transcend.io`) */
  dashboardUrl: string;
  /** The assessment form ID */
  assessmentFormId: string;
  /** The parent assessment group ID, when known */
  assessmentGroupId?: string;
  /**
   * Current lifecycle status. Used to choose the primary `url`: for
   * `IN_REVIEW` we point at the parent group (matching the in-review email
   * convention in `composeAssessmentLink`), otherwise at the form's
   * read-only response page.
   */
  status?: AssessmentStatus;
}

/**
 * Deep links into the Transcend admin dashboard for a given assessment.
 *
 * We deliberately only expose URLs that are accessible to any logged-in user
 * with assessment view scope. The `/assessments/forms/:id/view` route (the
 * fillable-form page) is intentionally omitted — it only resolves when the
 * caller is the form's assignee, so surfacing it to LLM agents reliably
 * produces 404s for anyone else.
 */
export interface AssessmentLinks {
  /**
   * Canonical link to surface to the user. Either the form's read-only
   * response page or, for `IN_REVIEW` assessments with a known group ID, the
   * parent group page (matching `composeAssessmentLink`).
   */
  url: string;
  /** Parent assessment-group view (`/assessments/groups/:id`) when known */
  groupUrl?: string;
}

/**
 * Build canonical admin-dashboard deep links for an assessment. Tool handlers
 * should return these directly to the caller rather than letting downstream
 * LLM agents synthesize URLs from raw IDs (which has historically produced
 * 404s like `/privacy-requests/assessments/:id`).
 */
export function buildAssessmentLinks({
  dashboardUrl,
  assessmentFormId,
  assessmentGroupId,
  status,
}: BuildAssessmentLinksInput): AssessmentLinks {
  const base = dashboardUrl.replace(/\/$/, '');
  const formResponseUrl = `${base}/assessments/forms/${assessmentFormId}/response`;
  const groupUrl = assessmentGroupId
    ? `${base}/assessments/groups/${assessmentGroupId}`
    : undefined;

  const url = status === 'IN_REVIEW' && groupUrl ? groupUrl : formResponseUrl;

  return { url, groupUrl };
}

/**
 * Convenience builder for a standalone assessment-group link (used by group
 * list / create tools that don't have a specific form to point at).
 */
export function buildAssessmentGroupUrl(dashboardUrl: string, assessmentGroupId: string): string {
  return `${dashboardUrl.replace(/\/$/, '')}/assessments/groups/${assessmentGroupId}`;
}
