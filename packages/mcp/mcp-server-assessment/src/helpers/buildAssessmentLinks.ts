/** Inputs to {@link buildAssessmentLinks}. */
export interface BuildAssessmentLinksInput {
  /** Base admin-dashboard URL (e.g. `https://app.transcend.io`) */
  dashboardUrl: string;
  /** The assessment form ID */
  assessmentFormId: string;
}

/** Deep link into the Transcend admin dashboard for a given assessment. */
export interface AssessmentLinks {
  /** Read-only response page for the assessment. */
  url: string;
}

/**
 * Build the canonical admin-dashboard deep link for an assessment.
 *
 * Always points at `/assessments/forms/:id/response`, mirroring the
 * dashboard's own "View Responses" row action. The fillable
 * `/assessments/forms/:id/view` route is intentionally not emitted —
 * it only resolves for the form's assignee, which the MCP can't verify.
 */
export function buildAssessmentLinks({
  dashboardUrl,
  assessmentFormId,
}: BuildAssessmentLinksInput): AssessmentLinks {
  const base = dashboardUrl.replace(/\/$/, '');
  return { url: `${base}/assessments/forms/${assessmentFormId}/response` };
}

/** Build a link to the assessment-group page (for group-level tools). */
export function buildAssessmentGroupUrl(dashboardUrl: string, assessmentGroupId: string): string {
  return `${dashboardUrl.replace(/\/$/, '')}/assessments/groups/${assessmentGroupId}`;
}
