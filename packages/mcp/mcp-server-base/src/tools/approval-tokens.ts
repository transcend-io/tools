import { createHash, randomUUID } from 'node:crypto';

import { makeEnum } from '@transcend-io/type-utils';

import { getRequestAuth } from '../auth-context.js';

/** How long a minted approval stays redeemable. */
export const APPROVAL_TOKEN_TTL_MS = 10 * 60 * 1000;

/** Cap on outstanding approvals; oldest is dropped when hit. */
export const MAX_PENDING_APPROVALS = 64;

/** Outcome of attempting to redeem an approval token. */
export const ApprovalTokenOutcome = makeEnum({
  /** Matched and spent */
  Claimed: 'CLAIMED',
  /** Never issued, already spent, or lost to a restart */
  Unknown: 'UNKNOWN',
  /** Past its TTL */
  Expired: 'EXPIRED',
  /** Bound to a different tool, args, or login */
  Mismatch: 'MISMATCH',
});

export type ApprovalTokenOutcome = (typeof ApprovalTokenOutcome)[keyof typeof ApprovalTokenOutcome];

interface PendingApproval {
  toolName: string;
  fingerprint: string;
  expiresAt: number;
}

/**
 * In-memory, single-use approvals for stdio hosts that cannot render a form.
 * Soft gate only — the agent both receives and replays the token.
 */
export class ApprovalTokenStore {
  private readonly pending = new Map<string, PendingApproval>();

  constructor(
    private readonly ttlMs: number = APPROVAL_TOKEN_TTL_MS,
    private readonly maxPending: number = MAX_PENDING_APPROVALS,
  ) {}

  /** Mint an approval bound to this tool, args, and caller. */
  mint(
    toolName: string,
    args: unknown,
  ): {
    token: string;
    expiresAt: number;
  } {
    this.evictExpired();
    while (this.pending.size >= this.maxPending) {
      const oldest = this.pending.keys().next();
      if (oldest.done) break;
      this.pending.delete(oldest.value);
    }

    const token = randomUUID();
    const expiresAt = Date.now() + this.ttlMs;
    this.pending.set(token, { toolName, fingerprint: fingerprint(toolName, args), expiresAt });
    return { token, expiresAt };
  }

  /**
   * Spend an approval before the mutation runs. Removed first so concurrent
   * replays fail; {@link restore} puts it back if the mutation throws.
   */
  claim(toolName: string, args: unknown, token: string): ApprovalTokenOutcome {
    const entry = this.pending.get(token);
    if (!entry) return ApprovalTokenOutcome.Unknown;

    this.pending.delete(token);

    if (entry.expiresAt <= Date.now()) return ApprovalTokenOutcome.Expired;
    if (entry.toolName !== toolName || entry.fingerprint !== fingerprint(toolName, args)) {
      return ApprovalTokenOutcome.Mismatch;
    }
    return ApprovalTokenOutcome.Claimed;
  }

  /** Put a claimed approval back after a failed mutation, if still in window. */
  restore(token: string, toolName: string, args: unknown, expiresAt: number): void {
    if (expiresAt <= Date.now()) return;
    this.pending.set(token, { toolName, fingerprint: fingerprint(toolName, args), expiresAt });
  }

  /** Expiry of an outstanding token, if any. */
  expiryOf(token: string): number | undefined {
    return this.pending.get(token)?.expiresAt;
  }

  get size(): number {
    this.evictExpired();
    return this.pending.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [token, entry] of this.pending) {
      if (entry.expiresAt <= now) this.pending.delete(token);
    }
  }
}

/** Hash of tool + args + caller credentials. */
function fingerprint(toolName: string, args: unknown): string {
  return createHash('sha256')
    .update(`${toolName}\u0000${canonicalize(args)}\u0000${callerFingerprint()}`)
    .digest('hex');
}

/** Stable JSON-like form with sorted object keys. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`);
  return `{${entries.join(',')}}`;
}

/** Prefer refresh token for OAuth so access-token rotation does not invalidate approvals. */
function callerFingerprint(): string {
  const auth = getRequestAuth();
  if (!auth) return 'anonymous';

  const material =
    auth.type === 'apiKey'
      ? `apiKey:${auth.apiKey}`
      : auth.type === 'sessionCookie'
        ? `sessionCookie:${auth.organizationId}:${auth.cookie}`
        : `oauthToken:${auth.refreshToken ?? auth.accessToken}`;

  return createHash('sha256').update(material).digest('hex').slice(0, 32);
}
