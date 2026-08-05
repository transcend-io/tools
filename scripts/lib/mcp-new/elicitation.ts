/**
 * Scaffolds a tool that collects its arguments through a host-rendered form.
 *
 * The form schema this writes is deliberately valid rather than a placeholder.
 * `assertElicitFormSchema` runs at construction, so an empty `properties` or an
 * empty `elicitMessage` would produce a package that throws on boot — a generator
 * emitting code that cannot run is worse than one emitting nothing. One required
 * string field is the smallest thing that is both real and obviously meant to be
 * replaced.
 *
 * Modeled on `dev/mcp-server-examples/src/tools/elicitation.ts`, which is the same
 * shape with every legal field type and is worth reading before extending the form.
 * No MCP App variant, on purpose: precedence is app, then elicitation, then
 * baseline, so a tool offering both resolves to its view on every host that
 * supports one and the form is never exercised.
 */

import { join } from 'node:path';

import type { McpPackage } from '../mcp-app-dev.ts';
import { writeNew, type ArtifactNames, type ScaffoldResult } from './shared.ts';

/** Options for {@link elicitationSource}. */
interface ElicitationSourceOptions {
  /** Exported factory's name, e.g. `createConfirmOptoutTool` */
  factory: string;
  /** Payload helper's name, e.g. `confirmOptoutPayload` */
  payload: string;
  /** Zod schema constant's name, e.g. `ConfirmOptoutSchema` */
  schema: string;
  /** Tool's name on the wire, e.g. `consent_confirm_optout` */
  toolName: string;
}

/** Source for a tool whose elicitation variant collects what the agent omitted. */
function elicitationSource({
  factory,
  payload,
  schema,
  toolName,
}: ElicitationSourceOptions): string {
  const input = schema.replace(/Schema$/, 'Input');

  return `import {
  createToolResult,
  defineToolWithCapabilities,
  McpClientCapability,
  requestElicitation,
  z,
  type ElicitFormSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

/** Prompt shown above the form, which is where a user learns why they are being asked. */
const FORM_MESSAGE = 'TODO: explain what is being asked for and why, in one sentence.';

/** Fields the form insists on, and therefore the only ones worth interrupting for. */
const REQUIRED_FIELDS = ['value'] as const;

/**
 * Fields the host collects when it supports elicitation.
 *
 * The spec restricts this to a flat object of primitives: no nested objects, and
 * the one legal \`array\` is a multi-select of titled \`anyOf\` items. Nesting fails
 * in \`assertElicitFormSchema\` at construction rather than when a host refuses the
 * request mid-conversation. See \`example_elicitation\` for every allowed shape.
 */
const FORM_SCHEMA: ElicitFormSchema = {
  type: 'object',
  properties: {
    // TODO: replace with the fields this tool needs, keeping them flat.
    value: {
      type: 'string',
      title: 'Value',
      description: 'TODO: what this field collects.',
      minLength: 1,
    },
  },
  required: [...REQUIRED_FIELDS],
};

/**
 * Arguments the tool accepts, mirroring {@link FORM_SCHEMA}.
 *
 * Every field is optional here even though the form requires one: an agent may
 * supply it directly, and the point of the variant is to ask only for what is
 * missing.
 */
export const ${schema} = z.object({
  value: z
    .string()
    .optional()
    .describe('TODO: what this argument sets. Collected through a form when omitted.'),
});
export type ${input} = z.infer<typeof ${schema}>;

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
 * Builds the response, reporting how the values were obtained alongside them.
 *
 * Always a successful result, including when the user declined. The tool did what
 * it was asked to; an outcome the agent can read is what lets it explain itself
 * rather than retry a refusal as though it were a transient error.
 */
function ${payload}(
  /** How the values below were obtained */
  outcome: FormOutcome,
  /** Values from the agent, the form, or both */
  fields: ${input},
  /** Field paths a host answered with the wrong type */
  invalidFields?: string[],
): unknown {
  return createToolResult(true, {
    outcome,
    // TODO: do the tool's actual work here, using \`fields\`.
    fields,
    ...(invalidFields && { invalidFields }),
  });
}

/**
 * TODO: describe what this tool does and what it needs from the user.
 *
 * Not registered yet. Add \`${factory}()\` to the array its package returns from
 * \`src/tools/index.ts\`, which is the point at which the name and description
 * below become public API.
 */
export function ${factory}(_clients?: ToolClients) {
  return defineToolWithCapabilities({
    name: '${toolName}',
    description: 'TODO: what this does, and what it asks the user for.',
    category: 'TODO',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ${schema},
    // Hosts here cannot be asked anything, so use what the agent supplied rather
    // than inventing values it never chose.
    handler: async (args) => ${payload}('unavailable', args),
    variants: {
      [McpClientCapability.Elicitation]: {
        elicitMessage: FORM_MESSAGE,
        elicitSchema: FORM_SCHEMA,
        handler: async (args) => {
          // Interrupt only for what is actually missing. Re-prompting for an
          // argument the agent already chose costs the user a dialog and changes
          // nothing about the answer.
          if (REQUIRED_FIELDS.every((field) => args[field] !== undefined)) {
            return ${payload}('not-asked', args);
          }

          const answer = await requestElicitation(FORM_MESSAGE, FORM_SCHEMA);

          // Reachable only outside a session, since this variant runs solely on
          // hosts that declared elicitation.
          if (!answer) return ${payload}('unavailable', args);

          // Declining and cancelling are kept apart on purpose. A decline is an
          // answer — the user does not want this — so a caller should not ask
          // again. A cancel is the absence of one, which it reasonably might.
          if (answer.action === 'decline') return ${payload}('declined', {});
          if (answer.action === 'cancel') return ${payload}('cancelled', {});

          // Parsed rather than trusted: \`requestedSchema\` states what a host
          // should collect and nothing enforces that what comes back matches, so
          // a wrong type here would otherwise surface further down as a puzzle.
          const parsed = ${schema}.safeParse(answer.content ?? {});
          if (!parsed.success) {
            return ${payload}(
              'malformed',
              args,
              parsed.error.issues.map((issue) => issue.path.join('.')),
            );
          }

          return ${payload}('answered', { ...args, ...parsed.data });
        },
      },
    },
  });
}
`;
}

/** Writes a single form-collecting tool, leaving every manifest alone. */
export function scaffoldElicitation(pkg: McpPackage, names: ArtifactNames): ScaffoldResult {
  const { snakeCase, pascalCase, camelCase, toolName, shortName } = names;
  const factory = `create${pascalCase}Tool`;

  writeNew(
    join(pkg.dir, 'src', 'tools', `${snakeCase}.ts`),
    elicitationSource({
      factory,
      payload: `${camelCase}Payload`,
      schema: `${pascalCase}Schema`,
      toolName,
    }),
  );

  return {
    factory,
    toolModule: `./${snakeCase}.js`,
    steps: ['Replace the TODOs, starting with the form fields and the prompt above them.'],
    notes: [
      `Then: pnpm mcp:inspect ${shortName} to see the form. The Inspector supports elicitation, so the variant is exercised by default.`,
    ],
    manifestChanged: false,
  };
}
