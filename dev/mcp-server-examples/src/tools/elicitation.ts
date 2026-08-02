import {
  createToolResult,
  defineToolWithCapabilities,
  McpClientCapability,
  requestElicitation,
  z,
  type ElicitFormSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

/** Prompt shown above the form, which is where a user learns why they are being asked. */
const FORM_MESSAGE =
  'These values are only echoed back into the conversation. Nothing is stored and no API is called.';

/** Options the two select fields offer, with the titles a host displays for them. */
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

/** Fields the form insists on, and therefore the only ones worth interrupting for. */
const REQUIRED_FIELDS = ['label', 'priority'] as const;

/**
 * Every field shape `elicitation/create` allows, in one form.
 *
 * The spec restricts this to a flat object of primitives, which is narrower than
 * it sounds in two directions worth knowing. A select gets its display titles
 * from `oneOf` entries; the `enum` plus `enumNames` pair still validates but is
 * deprecated in the SDK, so copying it forward would spread a dead shape. And a
 * multi-select is the one legal `array` — of titled `anyOf` items — even though
 * arrays are otherwise rejected. `format` on a string is limited to `date`,
 * `date-time`, `email`, and `uri`.
 *
 * Nesting an object anywhere fails at construction, in `assertElicitFormSchema`,
 * rather than when a host refuses the request mid-conversation.
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

/** Why a response holds the values it holds. */
export type FormOutcome =
  /** The user filled the form in */
  | 'answered'
  /** The agent had already supplied everything the form would have collected */
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
 * Builds the response, which reports how the values were obtained alongside them.
 *
 * Always a successful result, including when the user declined. The tool did
 * exactly what it was asked to; an outcome the agent can read is what lets it
 * explain itself rather than retry a refusal as though it were a transient error.
 */
function echoPayload(
  /** How the values below were obtained */
  outcome: FormOutcome,
  /** Values to echo, from the agent, the form, or both */
  fields: ExampleElicitationInput,
  /** Field paths a host answered with the wrong type */
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
 * Deliberately has no MCP App variant. Variant precedence is app, then
 * elicitation, then baseline, so a tool offering both resolves to its view on any
 * host that supports one — which is every host worth testing against, including
 * the Inspector. Keeping this one form-only is what makes the form flow reachable
 * from a host that renders views, instead of only from one that cannot.
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
    // Hosts here cannot be asked anything, so echo what the agent supplied rather
    // than inventing values it never chose.
    handler: async (args) => echoPayload('unavailable', args),
    variants: {
      [McpClientCapability.Elicitation]: {
        elicitMessage: FORM_MESSAGE,
        elicitSchema: FORM_SCHEMA,
        handler: async (args) => {
          // Interrupt only for what is actually missing. Re-prompting for an
          // argument the agent already chose costs the user a dialog and changes
          // nothing about the answer.
          if (REQUIRED_FIELDS.every((field) => args[field] !== undefined)) {
            return echoPayload('not-asked', args);
          }

          const answer = await requestElicitation(FORM_MESSAGE, FORM_SCHEMA);

          // Reachable only outside a session, since this variant runs solely on
          // hosts that declared elicitation.
          if (!answer) return echoPayload('unavailable', args);

          // Declining and cancelling are kept apart on purpose. A decline is an
          // answer — the user does not want this — so a caller should not ask
          // again. A cancel is the absence of one, which it reasonably might.
          if (answer.action === 'decline') return echoPayload('declined', {});
          if (answer.action === 'cancel') return echoPayload('cancelled', {});

          // Parsed rather than trusted: `requestedSchema` states what a host
          // should collect and nothing enforces that what comes back matches, so
          // a wrong type here would otherwise surface as a puzzling echo.
          const parsed = ExampleElicitationSchema.safeParse(answer.content ?? {});
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
