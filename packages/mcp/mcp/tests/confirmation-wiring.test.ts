/**
 * That the umbrella server actually offers a way to confirm a gated tool.
 *
 * Exists because of a real failure: the umbrella CLI has its own bootstrap and
 * called `buildMcpServer` without a transport, so stdio silently lost the token
 * fallback and every gated tool refused with `CONFIRMATION_UNAVAILABLE`, listing
 * and running right up to the point of refusing. `transport` being required makes
 * the omission a type error; this is the behavioral guard.
 */

import {
  APPROVAL_TOKEN_ARG,
  ApprovalTokenStore,
  ConfirmationPolicy,
  EMPTY_CAPABILITY_REPORT,
  expandToolsForClient,
  z,
  type ConfirmationGate,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-base';
import { describe, expect, it, vi } from 'vitest';

import { ToolRegistry, type UmbrellaToolClients } from '../src/registry.js';

/** The gate a stdio session builds for itself. */
function elicitOrToken(): ConfirmationGate {
  return { policy: ConfirmationPolicy.ElicitOrToken, tokens: new ApprovalTokenStore() };
}

const stubFn = () => vi.fn();

const mockClients = {
  rest: new Proxy({} as ToolClients['rest'], { get: stubFn }),
  graphql: new Proxy({}, { get: stubFn }),
  dashboardUrl: 'https://app.transcend.io',
} as unknown as UmbrellaToolClients;

function umbrellaTools(): ToolDefinition[] {
  return new ToolRegistry(mockClients).getAllTools();
}

/** Minimal valid args so widened schemas can be parsed with an approval token. */
const MINIMAL_GATED_TOOL_ARGS: Record<string, Record<string, unknown>> = {
  dsr_cancel: { requestId: 'req-1' },
  dsr_submit: {
    workflowConfigId: '00000000-0000-4000-8000-000000000001',
    email: 'a@example.com',
  },
  dsr_enrich_identifiers: {
    nonce: 'nonce',
    identifiers: { email: 'a@example.com' },
  },
  preferences_delete: {
    partition: 'default',
    records: [
      {
        anchorIdentifier: { name: 'email', value: 'a@example.com' },
        timestamp: '2020-01-01T00:00:00.000Z',
      },
    ],
  },
  preferences_delete_identifiers: {
    partition: 'default',
    records: [
      {
        anchorIdentifier: { name: 'email', value: 'a@example.com' },
        delete: { name: 'phone', value: '+15555555555' },
        timestamp: '2020-01-01T00:00:00.000Z',
      },
    ],
  },
  preferences_update_identifiers: {
    partition: 'default',
    records: [
      {
        anchorIdentifier: { name: 'email', value: 'a@example.com' },
        update: { name: 'email', oldValue: 'a@example.com', newValue: 'b@example.com' },
        timestamp: '2020-01-01T00:00:00.000Z',
      },
    ],
  },
};

describe('umbrella confirmation wiring', () => {
  it('gates at least one tool, so the rest of this file is meaningful', () => {
    expect(umbrellaTools().filter((tool) => tool.confirmation).length).toBeGreaterThan(0);
  });

  it('offers approvalToken on every gated tool when running over stdio', () => {
    const tools = umbrellaTools();
    const gatedNames = tools.filter((tool) => tool.confirmation).map((tool) => tool.name);

    const expanded = expandToolsForClient(tools, EMPTY_CAPABILITY_REPORT, elicitOrToken());

    for (const name of gatedNames) {
      const tool = expanded.find((candidate) => candidate.name === name)!;
      const object = tool.zodSchema as z.ZodObject<z.ZodRawShape>;

      expect(Object.keys(object.shape), `${name} was not widened`).toContain(APPROVAL_TOKEN_ARG);

      // The shape is what decides whether the token survives: `build-server` hands
      // the handler `parseResult.data`, and Zod drops keys it does not know rather
      // than rejecting them. A tool that advertised the token but stripped it would
      // re-ask forever, so assert on the parsed output and not on parsing merely
      // not erroring. Replay always resends the approved args plus approvalToken,
      // so parse with minimal valid args for each gated tool (Zod 4 forbids
      // `.partial()` on schemas with refinements such as dsr_enrich_identifiers).
      const minimalArgs = MINIMAL_GATED_TOOL_ARGS[name];
      expect(minimalArgs, `missing minimal args fixture for ${name}`).toBeDefined();
      expect(object.parse({ ...minimalArgs, [APPROVAL_TOKEN_ARG]: 'tok' }), name).toMatchObject({
        [APPROVAL_TOKEN_ARG]: 'tok',
      });
    }
  });

  it('does not strand a gated tool: a form-less stdio host is told how to proceed', async () => {
    // The symptom that started this: a refusal with no way forward. Over stdio the
    // answer must be CONFIRMATION_REQUIRED with a token, never UNAVAILABLE.
    const tools = umbrellaTools();
    const gated = expandToolsForClient(tools, EMPTY_CAPABILITY_REPORT, elicitOrToken()).find(
      (tool) => tool.name === 'dsr_cancel',
    )!;

    const result = (await gated.handler({ requestId: 'req-1' })) as {
      code: string;
      details?: {
        /** Token the caller replays to proceed */
        approvalToken?: string;
      };
    };

    expect(result.code).toBe('CONFIRMATION_REQUIRED');
    expect(result.details?.approvalToken).toEqual(expect.any(String));
  });

  it('does not describe gated tools to an embedder that could never confirm them', () => {
    // getToolList is what an embedder shows its model. Listing a tool that
    // executeTool always refuses would have the model plan around a dead end.
    const registry = new ToolRegistry(mockClients);
    const gatedNames = registry
      .getAllTools()
      .filter((tool) => tool.confirmation)
      .map((tool) => tool.name);
    const described = registry.getToolList().map((tool) => tool.name);

    expect(gatedNames.length).toBeGreaterThan(0);
    for (const name of gatedNames) {
      expect(described, name).not.toContain(name);
    }
  });

  it('does not let an embedder call a gated tool straight through', async () => {
    // executeTool is the in-process path: no elicitation channel and nowhere to hand
    // a token back, so running the registered handler would walk past the gate.
    const result = (await new ToolRegistry(mockClients).executeTool('dsr_cancel', {
      requestId: 'req-1',
    })) as { code: string; success: boolean };

    expect(result.success).toBe(false);
    expect(result.code).toBe('CONFIRMATION_UNAVAILABLE');
  });
});
