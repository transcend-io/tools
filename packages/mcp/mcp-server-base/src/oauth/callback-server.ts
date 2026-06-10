import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { OAUTH_CALLBACK_TIMEOUT_MS } from './constants.js';
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

/**
 * Starts an ephemeral HTTP server on `127.0.0.1:0` to receive the OAuth redirect.
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

    const callbackPromise = new Promise<OAuthCallbackResult>((resolve, reject) => {
      resolveCallback = resolve;
      rejectCallback = reject;
    });

    const server = createServer((req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const requestUrl = new URL(req.url, 'http://127.0.0.1');
      const error = requestUrl.searchParams.get('error');
      const errorDescription = requestUrl.searchParams.get('error_description');

      if (error) {
        finishWithError(
          new Error(
            `OAuth authorization failed: ${error}${errorDescription ? ` — ${errorDescription}` : ''}`,
          ),
        );
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<p>Authorization failed. Return to your editor and try again.</p>');
        return;
      }

      const code = requestUrl.searchParams.get('code');
      const state = requestUrl.searchParams.get('state');

      if (!code) {
        finishWithError(new Error('OAuth callback is missing authorization code'));
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<p>Authorization failed: missing code.</p>');
        return;
      }

      if (!state || state !== options.expectedState) {
        finishWithError(new Error('OAuth callback state mismatch'));
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<p>Authorization failed: invalid state.</p>');
        return;
      }

      finishWithSuccess({ code, state });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(SUCCESS_HTML);
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

    server.listen(0, '127.0.0.1', () => {
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

      resolveStart({
        port,
        redirectUri,
        waitForCallback: () => callbackPromise,
        close: closeServer,
      });
    });

    function closeServer(): Promise<void> {
      clearTimeout(timeoutId);
      return new Promise((resolveClose, rejectClose) => {
        if (!server.listening) {
          resolveClose();
          return;
        }
        server.close((err) => {
          if (err) rejectClose(err);
          else resolveClose();
        });
      });
    }
  });
}
