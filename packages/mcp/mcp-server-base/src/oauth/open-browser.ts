import open from 'open';

import { type Logger } from '../clients/graphql/base.js';

/**
 * Opens the system default browser to the given URL (best-effort).
 */
export async function openBrowser(url: string, logger: Logger): Promise<void> {
  try {
    await open(url);
  } catch (error) {
    logger.warn('Unable to open browser automatically. Please open this URL manually', {
      url,
      error,
    });
  }
}
