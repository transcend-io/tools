import { ErrorCode, requestAuthContext, ToolError } from '@transcend-io/mcp-server-base';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  _clearPendingCreateConfirmations,
  confirmCreateConfirmation,
  getPendingCreateContext,
  updatePendingCreateSuggestions,
  waitForCreateConfirmation,
} from '../src/pending-create-confirmation.js';

const auth = { type: 'apiKey' as const, apiKey: 'test-key' };

function runWithAuth<T>(fn: () => T): T {
  return requestAuthContext.run(auth, fn);
}

describe('pending create confirmation', () => {
  afterEach(() => {
    _clearPendingCreateConfirmations();
    vi.useRealTimers();
  });

  it('resolves when confirmCreateConfirmation is called with valid token', async () => {
    const pending = runWithAuth(() =>
      waitForCreateConfirmation({
        suggestedTitle: 'DPIA',
        suggestedAssessmentGroupId: 'grp-1',
        operation: 'create',
        confirmationToken: 'token-abc',
      }),
    );

    runWithAuth(() => {
      const ctx = confirmCreateConfirmation({
        title: 'Confirmed DPIA',
        assessmentGroupId: 'grp-1',
        assigneeIds: ['user-1'],
        confirmationToken: 'token-abc',
      });
      expect(ctx.operation).toBe('create');
    });

    await expect(pending).resolves.toEqual({
      title: 'Confirmed DPIA',
      assessmentGroupId: 'grp-1',
      assigneeIds: ['user-1'],
    });
  });

  it('rejects invalid confirmation token', () => {
    runWithAuth(() => {
      void waitForCreateConfirmation({
        operation: 'create',
        confirmationToken: 'token-abc',
      });
    });

    expect(() =>
      runWithAuth(() =>
        confirmCreateConfirmation({
          title: 'Test',
          assessmentGroupId: 'grp-1',
          assigneeIds: ['user-1'],
          confirmationToken: 'wrong-token',
        }),
      ),
    ).toThrow(ToolError);
  });

  it('exposes pending context for MCP App', () => {
    runWithAuth(() => {
      void waitForCreateConfirmation({
        suggestedTitle: 'My Assessment',
        suggestedAssessmentGroupId: 'grp-2',
        suggestedAssigneeId: 'user-9',
        operation: 'prefill',
        confirmationToken: 'token-xyz',
      });

      expect(getPendingCreateContext()).toEqual({
        suggestedTitle: 'My Assessment',
        suggestedAssessmentGroupId: 'grp-2',
        suggestedAssigneeId: 'user-9',
        confirmationToken: 'token-xyz',
        operation: 'prefill',
      });
    });
  });

  it('updates pending suggestions after registration', () => {
    runWithAuth(() => {
      void waitForCreateConfirmation({
        operation: 'create',
        confirmationToken: 'token-xyz',
      });

      updatePendingCreateSuggestions({
        suggestedTitle: 'Enriched title',
        suggestedAssessmentGroupId: 'grp-enriched',
        suggestedAssigneeId: 'user-enriched',
      });

      expect(getPendingCreateContext()).toEqual({
        suggestedTitle: 'Enriched title',
        suggestedAssessmentGroupId: 'grp-enriched',
        suggestedAssigneeId: 'user-enriched',
        confirmationToken: 'token-xyz',
        operation: 'create',
      });
    });
  });

  it('rejects when no pending confirmation exists', () => {
    expect(() =>
      runWithAuth(() =>
        confirmCreateConfirmation({
          title: 'Test',
          assessmentGroupId: 'grp-1',
          assigneeIds: ['user-1'],
          confirmationToken: 'token-abc',
        }),
      ),
    ).toThrow(ToolError);
    try {
      runWithAuth(() =>
        confirmCreateConfirmation({
          title: 'Test',
          assessmentGroupId: 'grp-1',
          assigneeIds: ['user-1'],
          confirmationToken: 'token-abc',
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ToolError);
      expect((error as ToolError).code).toBe(ErrorCode.NOT_FOUND);
    }
  });

  it('rejects on timeout', async () => {
    vi.useFakeTimers();

    const pending = runWithAuth(() =>
      waitForCreateConfirmation({
        operation: 'create',
        confirmationToken: 'token-timeout',
      }),
    );

    vi.advanceTimersByTime(10 * 60 * 1000 + 1);

    await expect(pending).rejects.toMatchObject({
      code: ErrorCode.TIMEOUT,
    });
  });

  it('prevents overlapping confirmations for the same caller', () => {
    runWithAuth(() => {
      void waitForCreateConfirmation({ operation: 'create', confirmationToken: 'token-1' });
      expect(() =>
        waitForCreateConfirmation({ operation: 'create', confirmationToken: 'token-2' }),
      ).toThrow(ToolError);
    });
  });
});
