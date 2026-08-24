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

/** Static authoring guide for policy_help. */
export const POLICY_AUTHORING_GUIDE = `# Policy Engine authoring guide

Policy Engine (Seneca) bundles are **OPA Rego** packages uploaded as immutable versions, then explicitly activated.

## Package layout

- Use tenant-unique \`bundleName\` values (e.g. \`main\`, \`marketing-consent\`).
- Include \`manifest.json\` with a non-empty \`roots\` array (e.g. \`["policy_engine"]\` or \`["policy_engine/transcend"]\`).
- Rego files use dotted \`package\` paths covered by manifest roots (\`policy_engine/foo\` ↔ root \`policy_engine/foo\`).
- OPA input JSON uses **snake_case** keys.
- Decision policies return \`allow\`, \`deny\`, or \`escalate\` via a \`decision\` outcome (see starter template).
- Exclude \`*_test.rego\` from uploads — they are for local testing only.
- Upload limits: **5 KiB compressed**, **50 KiB decompressed** (\`manifest.json\` + publishable \`.rego\` only).

## Workflow

1. **policy_help** — guide (no args) or scaffold files (\`templateId\`).
2. **policy_publish** — upload inert version via \`files\` (from help) or \`dir\`.
3. **policy_set_live** — activate or deactivate.

Never combine publish + activate in one step.

## Authentication scopes

Policy Engine scopes are hierarchical:

- \`ActivatePolicyEngineBundles\` **includes** Manage and View permissions.
- \`ManagePolicyEngineBundles\` **includes** View.

**Use a single API key or OAuth session with Activate Policy scope** for the full publish → set-live workflow.
Do not ask the user to create separate keys for view, publish, and activate.

## MCP tools

| Tool | Purpose |
|------|---------|
| policy_help | This guide + embedded templates |
| policy_status | List bundles, version history, download URLs |
| policy_publish | Upload inert version from \`files\` map or workspace \`dir\` |
| policy_set_live | Activate or deactivate a version |

CLI equivalents: \`transcend policy bundles\`, \`versions\`, \`download\`, \`publish\`, \`activate\`, \`deactivate\`.
`;

/**
 * Returns the authoring guide + template list, or scaffold files for one template.
 *
 * When `templateId` is set, omits the full guide and template list to avoid
 * repeating large text the agent already fetched (or does not need).
 *
 * @param templateId - Optional template id
 * @returns Guide + templates, or template files only
 */
export function resolvePolicyHelpContent(templateId?: string): {
  /** Full authoring guide (list mode only) */
  guide?: string;
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
    return { guide: POLICY_AUTHORING_GUIDE, templates };
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
