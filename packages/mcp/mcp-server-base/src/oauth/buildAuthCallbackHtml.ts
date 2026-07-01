import transcendLogoCipherSvg from '@tools/assets/transcend-logo-cipher.svg';

import { OAUTH_CALLBACK_ERROR_MESSAGE, OAUTH_CALLBACK_SUCCESS_MESSAGE } from './constants.js';

/**
 * Helper function to wrap the callback's message in an HTML template that matches the Transcend web app's display.
 */
export const buildAuthCallbackHtml = (isSuccess: boolean) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Transcend MCP Auth Landing</title>
    <style>
      svg {
        height: 37px;
        width: auto;
      }
    </style>
  </head>
  <body style="margin: 0; font-family: neue-haas-grotesk-display,sans-serif; --color-cipher: rgb(95, 91, 247);">
    <div style="display: flex; flex-direction: column; align-items: center;">
      <div style="padding: 30px 0; display: flex; gap: 3px;">
        ${transcendLogoCipherSvg}
        <span style="font-size: 22px; font-weight: 600; color: #0f0f16">Transcend</span>
      </div>
      <div style="display: flex; align-self: stretch; padding: 0 50px; justify-content: center">
        <div
          style="
            flex: 0 1 340px;
            padding: 80px 120px;
            border: 1px solid #e7e7ed;
            border-radius: 18px;
            display: flex;
            justify-content: center;
          "
        >
          <p style="text-align: center; margin: 0; color: #5b5b74; font-size: 14px;">${isSuccess ? OAUTH_CALLBACK_SUCCESS_MESSAGE : OAUTH_CALLBACK_ERROR_MESSAGE}</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
