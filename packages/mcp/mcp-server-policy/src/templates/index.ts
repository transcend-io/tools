/** Metadata for an embedded policy starter template. */
export interface PolicyTemplateSummary {
  /** Template identifier passed to policy_help */
  id: string;
  /** Short human-readable name */
  title: string;
  /** What the template demonstrates */
  description: string;
}

/** Files returned when a template is materialized. */
export interface PolicyTemplateFiles {
  /** Relative path → file contents */
  files: Record<string, string>;
}

const STARTER_MANIFEST = `{
  "roots": ["policy_engine"]
}
`;

const STARTER_DECISION_REGO = `package policy_engine

import rego.v1

# Default decision when no rule matches.
default decision := "deny"

# Example: allow when the subject has opted in to marketing.
decision := "allow" if {
\tinput.subject.marketing_opt_in == true
}

# Example: escalate high-risk requests for human review.
decision := "escalate" if {
\tinput.request.risk_score >= 80
}
`;

const STARTER_SAMPLE_INPUT = `{
  "subject": {
    "marketing_opt_in": false
  },
  "request": {
    "risk_score": 10
  }
}
`;

/** Embedded starter templates for policy_help. */
export const POLICY_TEMPLATES: Record<string, PolicyTemplateFiles & PolicyTemplateSummary> = {
  starter: {
    id: 'starter',
    title: 'Minimal Policy Engine starter',
    description:
      'Default allow/deny/escalate decision policy under package policy_engine with manifest roots.',
    files: {
      'manifest.json': STARTER_MANIFEST,
      'policy_engine/decision.rego': STARTER_DECISION_REGO,
      'sample-input.json': STARTER_SAMPLE_INPUT,
    },
  },
};

/**
 * Returns the template list, or scaffold files for one template.
 *
 * When `templateId` is set, omits the template list to avoid repeating
 * metadata the agent already fetched (or does not need).
 *
 * @param templateId - Optional template id
 * @returns Templates, or template files only
 */
export function resolvePolicyHelpContent(templateId?: string): {
  /** Template summaries (list mode only) */
  templates?: PolicyTemplateSummary[];
  /** Scaffold files when `templateId` is set */
  templateFiles?: PolicyTemplateFiles;
} {
  const templates = Object.values(POLICY_TEMPLATES).map(({ id, title, description }) => ({
    id,
    title,
    description,
  }));

  if (!templateId) {
    return { templates };
  }

  const template = POLICY_TEMPLATES[templateId];
  if (!template) {
    throw new Error(
      `Unknown templateId "${templateId}". Available: ${templates.map((entry) => entry.id).join(', ')}.`,
    );
  }

  return {
    templateFiles: { files: template.files },
  };
}
