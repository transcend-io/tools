import { randomUUID } from 'node:crypto';

import {
  ErrorCode,
  getRequestAuth,
  ToolError,
  type AuthCredentials,
} from '@transcend-io/mcp-server-base';

import type { PrefillContinuationArgs } from './tools/_prefillContinuation.js';

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export interface PendingCreateContext {
  /** Suggested title prepopulated in the form */
  suggestedTitle?: string;
  /** Suggested assessment group ID prepopulated in the form */
  suggestedAssessmentGroupId?: string;
  /** Suggested assignee user ID prepopulated in the form */
  suggestedAssigneeId?: string;
  /** One-time token required to confirm creation */
  confirmationToken: string;
  /** Whether this pending flow is for create or prefill */
  operation: 'create' | 'prefill';
  /** Prefill-only payload held until the user confirms */
  prefillPayload?: PrefillContinuationArgs;
}

export interface ConfirmedCreate {
  /** Confirmed assessment title */
  title: string;
  /** Confirmed assessment group ID */
  assessmentGroupId: string;
  /** Confirmed internal assignee user IDs */
  assigneeIds: string[];
}

export interface ConfirmCreateInput {
  /** Confirmed assessment title */
  title: string;
  /** Confirmed assessment group ID */
  assessmentGroupId: string;
  /** Confirmed internal assignee user IDs */
  assigneeIds: string[];
  /** One-time confirmation token from pending state */
  confirmationToken: string;
}

interface PendingEntry extends PendingCreateContext {
  resolve: (confirmed: ConfirmedCreate) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const pendingByCaller = new Map<string, PendingEntry>();

function getCallerKey(auth: AuthCredentials | null): string {
  if (!auth) return 'anonymous';
  if (auth.type === 'apiKey') return `apiKey:${auth.apiKey}`;
  return `session:${auth.organizationId}:${auth.cookie}`;
}

function getCallerKeyFromContext(): string {
  return getCallerKey(getRequestAuth());
}

/**
 * Blocks until the user confirms title, group, and assignee via
 * {@link confirmCreateConfirmation} or the confirmation times out.
 */
export function waitForCreateConfirmation(
  ctx: Omit<PendingCreateContext, 'confirmationToken'> & { confirmationToken?: string },
): Promise<ConfirmedCreate> {
  const callerKey = getCallerKeyFromContext();
  const existing = pendingByCaller.get(callerKey);
  if (existing) {
    throw new ToolError(
      ErrorCode.API_ERROR,
      'An assessment create confirmation is already in progress. Complete or cancel it before starting another.',
      false,
    );
  }

  const confirmationToken = ctx.confirmationToken ?? randomUUID();

  return new Promise<ConfirmedCreate>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingByCaller.delete(callerKey);
      reject(
        new ToolError(
          ErrorCode.TIMEOUT,
          'Assessment create confirmation timed out. Call the tool again to retry.',
          true,
        ),
      );
    }, DEFAULT_TIMEOUT_MS);

    pendingByCaller.set(callerKey, {
      suggestedTitle: ctx.suggestedTitle,
      suggestedAssessmentGroupId: ctx.suggestedAssessmentGroupId,
      suggestedAssigneeId: ctx.suggestedAssigneeId,
      confirmationToken,
      operation: ctx.operation,
      prefillPayload: ctx.prefillPayload,
      resolve: (confirmed) => {
        clearTimeout(timeout);
        pendingByCaller.delete(callerKey);
        resolve(confirmed);
      },
      reject: (error) => {
        clearTimeout(timeout);
        pendingByCaller.delete(callerKey);
        reject(error);
      },
      timeout,
    });
  });
}

/** Resolves the pending create confirmation for the current caller. */
export function confirmCreateConfirmation(input: ConfirmCreateInput): PendingCreateContext {
  const callerKey = getCallerKeyFromContext();
  const pending = pendingByCaller.get(callerKey);
  if (!pending) {
    throw new ToolError(
      ErrorCode.NOT_FOUND,
      'No assessment create confirmation is waiting.',
      false,
    );
  }
  if (pending.confirmationToken !== input.confirmationToken) {
    throw new ToolError(ErrorCode.VALIDATION_ERROR, 'Invalid confirmation token.', false);
  }
  if (!input.title.trim()) {
    throw new ToolError(ErrorCode.VALIDATION_ERROR, 'Title is required.', false);
  }
  if (!input.assessmentGroupId) {
    throw new ToolError(ErrorCode.VALIDATION_ERROR, 'Assessment group ID is required.', false);
  }
  if (!input.assigneeIds.length) {
    throw new ToolError(ErrorCode.VALIDATION_ERROR, 'At least one assignee ID is required.', false);
  }

  pending.resolve({
    title: input.title.trim(),
    assessmentGroupId: input.assessmentGroupId,
    assigneeIds: input.assigneeIds,
  });

  return {
    suggestedTitle: pending.suggestedTitle,
    suggestedAssessmentGroupId: pending.suggestedAssessmentGroupId,
    suggestedAssigneeId: pending.suggestedAssigneeId,
    confirmationToken: pending.confirmationToken,
    operation: pending.operation,
    prefillPayload: pending.prefillPayload,
  };
}

export interface CreateFormSuggestionUpdate {
  /** Suggested title prepopulated in the form */
  suggestedTitle?: string;
  /** Suggested assessment group ID prepopulated in the form */
  suggestedAssessmentGroupId?: string;
  /** Suggested assignee user ID prepopulated in the form */
  suggestedAssigneeId?: string;
}

/** Updates suggested defaults on the pending confirmation for the current caller. */
export function updatePendingCreateSuggestions(update: CreateFormSuggestionUpdate): void {
  const callerKey = getCallerKeyFromContext();
  const pending = pendingByCaller.get(callerKey);
  if (!pending) return;

  if (update.suggestedTitle !== undefined) {
    pending.suggestedTitle = update.suggestedTitle;
  }
  if (update.suggestedAssessmentGroupId !== undefined) {
    pending.suggestedAssessmentGroupId = update.suggestedAssessmentGroupId;
  }
  if (update.suggestedAssigneeId !== undefined) {
    pending.suggestedAssigneeId = update.suggestedAssigneeId;
  }
}

/** Returns form context for the MCP App for the current pending confirmation. */
export function getPendingCreateContext(): PendingCreateContext | null {
  const callerKey = getCallerKeyFromContext();
  const pending = pendingByCaller.get(callerKey);
  if (!pending) return null;

  return {
    suggestedTitle: pending.suggestedTitle,
    suggestedAssessmentGroupId: pending.suggestedAssessmentGroupId,
    suggestedAssigneeId: pending.suggestedAssigneeId,
    confirmationToken: pending.confirmationToken,
    operation: pending.operation,
  };
}

/** Whether a create confirmation is pending for the current caller. */
export function hasPendingCreateConfirmation(): boolean {
  return pendingByCaller.has(getCallerKeyFromContext());
}

/** Cancels a pending create confirmation for the current caller. */
export function cancelCreateConfirmation(
  reason = 'Assessment create confirmation was cancelled.',
): void {
  const callerKey = getCallerKeyFromContext();
  const pending = pendingByCaller.get(callerKey);
  if (!pending) return;

  pending.reject(new ToolError(ErrorCode.API_ERROR, reason, true));
}

/** @internal Test helper */
export function _clearPendingCreateConfirmations(): void {
  for (const pending of pendingByCaller.values()) {
    clearTimeout(pending.timeout);
  }
  pendingByCaller.clear();
}
