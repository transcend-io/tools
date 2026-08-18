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
  ApprovalTokenStore,
  ConfirmationPolicy,
  EMPTY_CAPABILITY_REPORT,
  expandToolsForClient,
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
      expect(
        tool.zodSchema
          .safeParse({ approvalToken: 'x' })
          .error?.issues.some((issue) => issue.path[0] === 'approvalToken'),
        `${name} rejected approvalToken outright`,
      ).not.toBe(true);
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
