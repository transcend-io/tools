import { createServer } from 'node:http';

import { buildAuthCallbackHtml } from './buildAuthCallbackHtml.js';
import { getOAuthRedirectHost, getOAuthRedirectPort, getOAuthRedirectUri } from './config.js';
import { OAUTH_CALLBACK_PATH, OAUTH_CALLBACK_TIMEOUT_MS } from './constants.js';
import {
  OAuthCallbackError,
  parseOAuthCallbackQuery,
  validateOAuthCallbackQuery,
} from './parse-callback.js';
import type { OAuthCallbackResult } from './types.js';

export interface StartCallbackServerOptions {
  /** Expected `state` query parameter for CSRF validation */
  expectedState: string;
  /** Milliseconds to wait for a callback before rejecting */
  timeoutMs?: number;
}

export interface CallbackServerHandle {
  /** Localhost port the server is bound to */
  port: number;
  /** Full redirect URI registered with the authorization server */
  redirectUri: string;
  /** Resolves when the browser redirect delivers a valid authorization code */
  waitForCallback: () => Promise<OAuthCallbackResult>;
  /** Stops the callback HTTP server */
  close: () => Promise<void>;
}

/**
 * Starts an HTTP server on {@link getOAuthRedirectHost} at {@link getOAuthRedirectPort} to receive the OAuth redirect.
 */
export function startCallbackServer(
  options: StartCallbackServerOptions,
): Promise<CallbackServerHandle> {
  const timeoutMs = options.timeoutMs ?? OAUTH_CALLBACK_TIMEOUT_MS;

  return new Promise((resolveStart, rejectStart) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let resolveCallback!: (result: OAuthCallbackResult) => void;
    let rejectCallback!: (error: Error) => void;
    let closeServer!: () => Promise<void>;

    const callbackPromise = new Promise<OAuthCallbackResult>((resolve, reject) => {
      resolveCallback = resolve;
      rejectCallback = reject;
    });

    const server = createServer((req, res) => {
      if (req.method !== 'GET') {
        res.writeHead(405);
        res.end('Method not allowed');
        return;
      }

      if (!req.url) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const { pathname } = new URL(req.url, 'http://127.0.0.1');
      if (pathname !== OAUTH_CALLBACK_PATH) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      if (settled) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buildAuthCallbackHtml(true));
        return;
      }

      try {
        const query = parseOAuthCallbackQuery(req.url);
        const result = validateOAuthCallbackQuery(query, options.expectedState);
        finishWithSuccess(result);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buildAuthCallbackHtml(true));
        void closeServer();
      } catch (error) {
        const message =
          error instanceof OAuthCallbackError ? error.message : 'OAuth callback validation failed';
        finishWithError(error instanceof Error ? error : new Error(message));
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buildAuthCallbackHtml(false));
        void closeServer();
      }
    });

    function finishWithSuccess(result: OAuthCallbackResult): void {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolveCallback(result);
    }

    function finishWithError(error: Error): void {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      rejectCallback(error);
    }

    server.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      rejectStart(err);
      rejectCallback(err);
    });

    const listenPort = getOAuthRedirectPort();
    const listenHost = getOAuthRedirectHost();
    server.listen(listenPort, listenHost, () => {
      const redirectUri = getOAuthRedirectUri();

      timeoutId = setTimeout(() => {
        finishWithError(new Error(`OAuth callback timed out after ${timeoutMs}ms`));
        void closeServer();
      }, timeoutMs);

      closeServer = () =>
        new Promise((resolveClose, rejectClose) => {
          clearTimeout(timeoutId);
          if (!server.listening) {
            resolveClose();
            return;
          }
          server.close((err) => {
            if (err) rejectClose(err);
            else resolveClose();
          });
        });

      resolveStart({
        port: listenPort,
        redirectUri,
        waitForCallback: () => callbackPromise,
        close: closeServer,
      });
    });
  });
}
