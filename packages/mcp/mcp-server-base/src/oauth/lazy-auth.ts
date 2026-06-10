import { getRequestAuth } from '../auth-context.js';
import type { Logger } from '../clients/graphql/base.js';
import { getOAuthIssuer, isOAuthModeEnabled } from './config.js';
import { startOAuthLogin } from './oauth-flow.js';

/** Whether OAuth consent has completed successfully in this process lifetime. */
let oauthSessionReady = false;

/** In-flight login promise shared across concurrent tool calls. */
let loginPromise: Promise<void> | null = null;

/**
 * Resets lazy OAuth session state (for tests).
 */
export function resetLazyOAuthState(): void {
  oauthSessionReady = false;
  loginPromise = null;
}

/**
 * Returns true when OAuth consent has already completed in this process.
 */
export function isLazyOAuthSessionReady(): boolean {
  return oauthSessionReady;
}

/**
 * Ensures OAuth consent has been obtained before a tool call when stdio OAuth mode
 * is active. Opens the browser on first use; concurrent tool calls share one flow.
 */
export async function ensureLazyOAuthAuth(logger: Logger): Promise<void> {
  if (!isOAuthModeEnabled()) {
    return;
  }

  if (getRequestAuth()) {
    return;
  }

  if (oauthSessionReady) {
    return;
  }

  if (!loginPromise) {
    loginPromise = performLazyOAuthLogin(logger).finally(() => {
      loginPromise = null;
    });
  }

  await loginPromise;
}

async function performLazyOAuthLogin(logger: Logger): Promise<void> {
  logger.info('OAuth required — opening browser for consent (lazy auth on first tool use)');

  let session: Awaited<ReturnType<typeof startOAuthLogin>> | undefined;
  try {
    session = await startOAuthLogin({ issuer: getOAuthIssuer(), logger });
    const callback = await session.waitForCallback();
    oauthSessionReady = true;
    logger.info('OAuth authorization code received', {
      state: callback.state,
      codeLength: callback.code.length,
    });
  } catch (error) {
    logger.error('OAuth login failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await session?.close().catch(() => undefined);
  }
}
