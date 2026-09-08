/**
 * Lifecycle of the approval tokens that stand in for a form on hosts that
 * cannot render one.
 *
 * The properties that matter are all negative: a token works exactly once, only
 * for what it was minted for, and only inside its window.
 */

import { describe, expect, it, vi } from 'vitest';

import { requestAuthContext } from '../src/auth-context.js';
import {
  ApprovalTokenOutcome,
  ApprovalTokenStore,
  canonicalize,
} from '../src/tools/approval-tokens.js';

const ARGS = { requestId: 'req-1', reason: 'duplicate' };

describe('ApprovalTokenStore', () => {
  it('releases the mutation for the token, tool, and arguments it was minted for', () => {
    const store = new ApprovalTokenStore();
    const { token } = store.mint('dsr_cancel', ARGS);

    expect(store.claim('dsr_cancel', ARGS, token)).toBe(ApprovalTokenOutcome.Claimed);
  });

  it('spends a token on first use, so a replay is refused', () => {
    const store = new ApprovalTokenStore();
    const { token } = store.mint('dsr_cancel', ARGS);

    expect(store.claim('dsr_cancel', ARGS, token)).toBe(ApprovalTokenOutcome.Claimed);
    expect(store.claim('dsr_cancel', ARGS, token)).toBe(ApprovalTokenOutcome.Unknown);
    expect(store.size).toBe(0);
  });

  it('refuses a token that was never issued', () => {
    const store = new ApprovalTokenStore();
    expect(store.claim('dsr_cancel', ARGS, 'made-up')).toBe(ApprovalTokenOutcome.Unknown);
  });

  it('refuses a token replayed for a different tool or different arguments', () => {
    const store = new ApprovalTokenStore();

    const forOtherTool = store.mint('dsr_cancel', ARGS).token;
    expect(store.claim('preferences_delete', ARGS, forOtherTool)).toBe(
      ApprovalTokenOutcome.Mismatch,
    );

    const forOtherArgs = store.mint('dsr_cancel', ARGS).token;
    expect(store.claim('dsr_cancel', { ...ARGS, requestId: 'req-2' }, forOtherArgs)).toBe(
      ApprovalTokenOutcome.Mismatch,
    );
  });

  it('refuses a token once its window has closed', () => {
    vi.useFakeTimers();
    try {
      const store = new ApprovalTokenStore(1_000);
      const { token } = store.mint('dsr_cancel', ARGS);

      vi.advanceTimersByTime(1_001);
      expect(store.claim('dsr_cancel', ARGS, token)).toBe(ApprovalTokenOutcome.Expired);
    } finally {
      vi.useRealTimers();
    }
  });

  it('accepts arguments the agent serialized in a different key order', () => {
    // Refusing here would reject a legitimate redemption, since nothing makes a
    // host preserve key order between the two calls.
    const store = new ApprovalTokenStore();
    const { token } = store.mint('dsr_cancel', { requestId: 'req-1', reason: 'duplicate' });

    expect(store.claim('dsr_cancel', { reason: 'duplicate', requestId: 'req-1' }, token)).toBe(
      ApprovalTokenOutcome.Claimed,
    );
  });

  it('binds a token to the credentials it was minted under', () => {
    // A re-login should not silently inherit approvals granted to the previous
    // session.
    const store = new ApprovalTokenStore();
    const token = requestAuthContext.run({ type: 'apiKey', apiKey: 'first' }, () =>
      store.mint('dsr_cancel', ARGS),
    ).token;

    const outcome = requestAuthContext.run({ type: 'apiKey', apiKey: 'second' }, () =>
      store.claim('dsr_cancel', ARGS, token),
    );
    expect(outcome).toBe(ApprovalTokenOutcome.Mismatch);
  });

  it('reinstates a claimed token when the mutation itself failed', () => {
    const store = new ApprovalTokenStore();
    const { token, expiresAt } = store.mint('dsr_cancel', ARGS);

    store.claim('dsr_cancel', ARGS, token);
    store.restore(token, 'dsr_cancel', ARGS, expiresAt);

    expect(store.claim('dsr_cancel', ARGS, token)).toBe(ApprovalTokenOutcome.Claimed);
  });

  it('does not reinstate a token whose original window has already closed', () => {
    const store = new ApprovalTokenStore();
    const { token } = store.mint('dsr_cancel', ARGS);

    store.claim('dsr_cancel', ARGS, token);
    store.restore(token, 'dsr_cancel', ARGS, Date.now() - 1);

    expect(store.claim('dsr_cancel', ARGS, token)).toBe(ApprovalTokenOutcome.Unknown);
  });

  it('caps how many approvals it holds at once', () => {
    const store = new ApprovalTokenStore(60_000, 2);
    const first = store.mint('dsr_cancel', { requestId: 'a' }).token;
    store.mint('dsr_cancel', { requestId: 'b' });
    store.mint('dsr_cancel', { requestId: 'c' });

    expect(store.size).toBe(2);
    expect(store.claim('dsr_cancel', { requestId: 'a' }, first)).toBe(ApprovalTokenOutcome.Unknown);
  });
});

describe('canonicalize', () => {
  it('renders equal values identically regardless of key order', () => {
    expect(canonicalize({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe(
      canonicalize({ a: [2, { c: 4, d: 3 }], b: 1 }),
    );
  });

  it('distinguishes values that merely look alike', () => {
    expect(canonicalize({ a: 1 })).not.toBe(canonicalize({ a: '1' }));
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });

  it('ignores keys explicitly set to undefined', () => {
    // Zod drops absent optionals, so an argument the agent sent as `undefined`
    // must hash the same as one it left out.
    expect(canonicalize({ a: 1, b: undefined })).toBe(canonicalize({ a: 1 }));
  });
});
