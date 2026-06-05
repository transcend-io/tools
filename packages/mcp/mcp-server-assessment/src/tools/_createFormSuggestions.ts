import type { AssessmentsMixin } from '../graphql.js';

export interface CreateFormSuggestions {
  /** Suggested title for the create form */
  suggestedTitle?: string;
  /** Suggested assessment group ID for the create form */
  suggestedAssessmentGroupId?: string;
  /** Suggested assignee user ID for the create form */
  suggestedAssigneeId?: string;
}

export interface CreateFormSuggestionsInput {
  /** Agent-provided title suggestion */
  suggested_title?: string;
  /** Agent-provided assessment group ID suggestion */
  suggested_assessment_group_id?: string;
  /** Agent-provided assignee user ID suggestion */
  suggested_assignee_id?: string;
  /** Template ID used to derive a suggested group when none is provided */
  template_id?: string;
}

/**
 * Resolves a template_id to a single assessment group ID for use as a UI suggestion.
 * Returns undefined when no unique match is found.
 */
export async function resolveTemplateToSuggestedGroupId(
  graphql: AssessmentsMixin,
  templateId: string,
): Promise<string | undefined> {
  const groups = await graphql.listAssessmentGroups({ first: 100 });
  const matchingGroups = groups.nodes.filter((g) => g.assessmentFormTemplate?.id === templateId);
  if (matchingGroups.length !== 1) return undefined;
  return matchingGroups[0]!.id;
}

/** Builds form suggestions from agent input and server-side defaults. */
export async function resolveCreateFormSuggestions(
  graphql: AssessmentsMixin & { getCurrentUser?: () => Promise<{ id: string }> },
  input: CreateFormSuggestionsInput,
): Promise<CreateFormSuggestions> {
  let suggestedAssessmentGroupId = input.suggested_assessment_group_id;

  if (!suggestedAssessmentGroupId && input.template_id) {
    suggestedAssessmentGroupId = await resolveTemplateToSuggestedGroupId(
      graphql,
      input.template_id,
    );
  }

  let suggestedAssigneeId = input.suggested_assignee_id;
  if (!suggestedAssigneeId && typeof graphql.getCurrentUser === 'function') {
    try {
      const user = await graphql.getCurrentUser();
      suggestedAssigneeId = user.id;
    } catch {
      // No current user available (e.g. org-level API key)
    }
  }

  return {
    suggestedTitle: input.suggested_title,
    suggestedAssessmentGroupId,
    suggestedAssigneeId,
  };
}
