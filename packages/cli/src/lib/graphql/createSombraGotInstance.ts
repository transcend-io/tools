import { createSombraGotInstance as sdkCreateSombraGotInstance } from '@transcend-io/sdk';
import type { Got } from 'got';

import { logger } from '../../logger.js';

/**
 * CLI wrapper around the SDK's createSombraGotInstance.
 * Preserves the legacy positional-arg signature and injects the CLI logger + env var.
 *
 * @param transcendUrl - URL of Transcend API
 * @param transcendApiKey - Transcend API key
 * @param sombraApiKey - Sombra API key
 * @returns got instance configured for Sombra requests
 */
export async function createSombraGotInstance(
  transcendUrl: string,
  transcendApiKey: string,
  sombraApiKey?: string,
): Promise<Got> {
  return sdkCreateSombraGotInstance(transcendUrl, transcendApiKey, {
    logger,
    sombraApiKey,
    sombraUrl: process.env.SOMBRA_URL,
  });
}
