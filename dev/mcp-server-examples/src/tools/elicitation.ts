import {
  createToolResult,
  defineToolWithCapabilities,
  McpClientCapability,
  requestElicitation,
  z,
  type ElicitFormSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

/** Prompt shown above the form. */
const FORM_MESSAGE =
  'These values are only echoed back into the conversation. Nothing is stored and no API is called.';

/** Options the two select fields offer, with the titles a host displays. */
const PRIORITIES = ['low', 'normal', 'high'] as const;
const PRIORITY_TITLES: Record<(typeof PRIORITIES)[number], string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};
const TAGS = ['alpha', 'beta', 'gamma'] as const;
const TAG_TITLES: Record<(typeof TAGS)[number], string> = {
  alpha: 'Alpha',
  beta: 'Beta',
  gamma: 'Gamma',
};

/** Fields the form insists on, and the only ones worth interrupting for. */
const REQUIRED_FIELDS = ['label', 'priority'] as const;

/**
 * Every field shape `elicitation/create` allows, in one form.
 *
 * A flat object of primitives, with two shapes worth copying carefully: a select
 * takes its titles from `oneOf`, not the SDK-deprecated `enum`/`enumNames` pair,
 * and a multi-select is the one legal `array`, of titled `anyOf` items. Nesting an
 * object fails at construction in `assertElicitFormSchema`.
 */
const FORM_SCHEMA: ElicitFormSchema = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
      title: 'Label',
      description: 'Any short text. It comes back verbatim in the response.',
      minLength: 1,
      maxLength: 40,
    },
    priority: {
      type: 'string',
      title: 'Priority',
      description: 'How the response labels this request.',
      oneOf: PRIORITIES.map((value) => ({ const: value, title: PRIORITY_TITLES[value] })),
    },
    repeat: {
      type: 'integer',
      title: 'Repeat',
      description: 'How many times the label is repeated in the echoed string.',
      minimum: 1,
      maximum: 5,
    },
    tags: {
      type: 'array',
      title: 'Tags',
      description: 'Any number of tags to attach to the response.',
      maxItems: TAGS.length,
      items: {
        anyOf: TAGS.map((value) => ({ const: value, title: TAG_TITLES[value] })),
      },
    },
    loud: {
      type: 'boolean',
      title: 'Loud',
      description: 'Whether the echoed label is uppercased.',
      default: false,
    },
  },
  required: [...REQUIRED_FIELDS],
};

export const ExampleElicitationSchema = z.object({
  label: z
    .string()
    .optional()
    .describe('Short text to echo back. Collected through a form when the agent omits it.'),
  priority: z
    .enum(PRIORITIES)
    .optional()
    .describe('How the response labels this request: low, normal, or high.'),
  repeat: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe('How many times the label is repeated in the echoed string, 1 to 5.'),
  tags: z
    .array(z.enum(TAGS))
    .optional()
    .describe('Tags to attach to the response: any of alpha, beta, or gamma.'),
  loud: z.boolean().optional().describe('Whether the echoed label is uppercased.'),
});
export type ExampleElicitationInput = z.infer<typeof ExampleElicitationSchema>;

/**
 * The same fields, held to what the form insisted on.
 *
 * The schema above stays optional because an agent may supply any subset. A host
 * accepting without a required field is not an answer, though, so it belongs in
 * `malformed`. The mask is typed from `REQUIRED_FIELDS` so the two cannot drift.
 */
const FormAnswerSchema = ExampleElicitationSchema.required({
  label: true,
  priority: true,
} satisfies { [Field in (typeof REQUIRED_FIELDS)[number]]: true });

/** Why a response holds the values it holds. */
export type FormOutcome =
  /** The user filled the form in */
  | 'answered'
  /** The agent already supplied everything the form would collect */
  | 'not-asked'
  /** The user refused */
  | 'declined'
  /** The user dismissed the form without deciding */
  | 'cancelled'
  /** The host cannot render a form at all */
  | 'unavailable'
  /** The host answered, but not with the shape it was asked for */
  | 'malformed';

/**
 * Builds the response, reporting how the values were obtained alongside them.
 *
 * Always a successful result, including a decline: the tool did what it was asked
 * to, and a readable outcome keeps the agent from retrying a refusal as an error.
 */
function echoPayload(
  /** How the values below were obtained */
  outcome: FormOutcome,
  /** Values to echo, from the agent, the form, or both */
  fields: ExampleElicitationInput,
  /** Field paths a host answered with the wrong type, or left out entirely */
  invalidFields?: string[],
): unknown {
  const label = fields.label?.trim();
  const cased = fields.loud === true ? label?.toUpperCase() : label;

  return createToolResult(true, {
    outcome,
    echo: cased ? Array.from({ length: fields.repeat ?? 1 }, () => cased).join(' ') : undefined,
    fields,
    ...(invalidFields && { invalidFields }),
  });
}

/**
 * Reference implementation of elicitation on its own.
 *
 * No MCP App variant on purpose. Precedence is app, then elicitation, so a tool
 * offering both resolves to its view on every host worth testing against. Staying
 * form-only is what keeps this flow reachable in the `pnpm mcp:inspect` loop at
 * all.
 */
export function createExampleElicitationTool(_clients?: ToolClients) {
  return defineToolWithCapabilities({
    name: 'example_elicitation',
    description:
      'Collect a handful of fields through a host-rendered form and echo them back. ' +
      'Demonstrates every field type elicitation allows, and what a tool should do when the ' +
      'user declines, dismisses the form, or the host cannot show one. Stores nothing.',
    category: 'Examples',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ExampleElicitationSchema,
    // Nothing to ask here, so echo what the agent supplied rather than inventing
    // values it never chose.
    handler: async (args) => echoPayload('unavailable', args),
    variants: {
      [McpClientCapability.Elicitation]: {
        elicitMessage: FORM_MESSAGE,
        elicitSchema: FORM_SCHEMA,
        handler: async (args) => {
          // Interrupt only for what is missing; re-prompting for an argument the
          // agent already chose costs a dialog and changes nothing.
          if (REQUIRED_FIELDS.every((field) => args[field] !== undefined)) {
            return echoPayload('not-asked', args);
          }

          const answer = await requestElicitation(FORM_MESSAGE, FORM_SCHEMA);

          // Reachable only outside a session, since this variant runs solely on
          // hosts that declared elicitation.
          if (!answer) return echoPayload('unavailable', args);

          // Kept apart on purpose: a decline is an answer, so a caller should not
          // ask again, while a cancel is the absence of one and reasonably might.
          if (answer.action === 'decline') return echoPayload('declined', {});
          if (answer.action === 'cancel') return echoPayload('cancelled', {});

          // Nothing enforces that a host answers with the shape `requestedSchema`
          // asked for, so a wrong type or missing field would otherwise surface as
          // a puzzling echo.
          const parsed = FormAnswerSchema.safeParse(answer.content ?? {});
          if (!parsed.success) {
            return echoPayload(
              'malformed',
              args,
              parsed.error.issues.map((issue) => issue.path.join('.')),
            );
          }

          return echoPayload('answered', { ...args, ...parsed.data });
        },
      },
    },
  });
}
