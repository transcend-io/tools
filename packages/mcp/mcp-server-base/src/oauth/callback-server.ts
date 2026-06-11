import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { getOAuthCallbackPort } from './config.js';
import { OAUTH_CALLBACK_TIMEOUT_MS } from './constants.js';
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

const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Transcend MCP</title></head>
<body>
  <p>Authentication complete. You can return to your editor.</p>
</body>
</html>`;

const ERROR_HTML = '<p>Authorization failed. Return to your editor and try again.</p>';

/**
 * Starts an ephemeral HTTP server on `127.0.0.1` to receive the OAuth redirect.
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

      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      if (settled) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(SUCCESS_HTML);
        return;
      }

      try {
        const query = parseOAuthCallbackQuery(req.url);
        const result = validateOAuthCallbackQuery(query, options.expectedState);
        finishWithSuccess(result);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(SUCCESS_HTML);
        void closeServer();
      } catch (error) {
        const message =
          error instanceof OAuthCallbackError ? error.message : 'OAuth callback validation failed';
        finishWithError(error instanceof Error ? error : new Error(message));
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(ERROR_HTML);
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

    const listenPort = getOAuthCallbackPort();
    server.listen(listenPort, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        rejectStart(new Error('Failed to determine OAuth callback server port'));
        return;
      }

      const port = (address as AddressInfo).port;
      const redirectUri = `http://127.0.0.1:${port}/callback`;

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
        port,
        redirectUri,
        waitForCallback: () => callbackPromise,
        close: closeServer,
      });
    });
  });
}
