import { sleepPromise, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { fetchConsentManagerDeployState } from './fetchConsentManagerDeployState.js';
import type { TranscendConsentManagerDeployState } from './gqls/consentManager.js';

/** States that mean a deploy or rollback is still running */
const PENDING_STATES: TranscendConsentManagerDeployState[] = ['DEPLOY_PENDING', 'ROLLBACK_PENDING'];

/** States that mean the last deploy failed */
const ERROR_STATES: TranscendConsentManagerDeployState[] = ['ERROR', 'TEST_ERROR'];

/**
 * Poll the consent manager until the deploy is no longer pending.
 * Throws when the deploy ends in an error state or the timeout is reached.
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns The final deploy state
 */
export async function waitForConsentManagerDeploy(
  client: GraphQLClient,
  options: {
    /** Max time to wait in milliseconds. Defaults to 10 minutes. */
    timeoutMs?: number;
    /** Time between polls in milliseconds. Defaults to 5 seconds. */
    pollIntervalMs?: number;
    /** Logger instance */
    logger?: Logger;
    /** Sleep function, injectable for tests */
    sleep?: (ms: number) => Promise<void>;
    /** Clock, injectable for tests */
    now?: () => number;
  } = {},
): Promise<TranscendConsentManagerDeployState> {
  const {
    timeoutMs = 10 * 60 * 1000,
    pollIntervalMs = 5000,
    logger,
    sleep = sleepPromise,
    now = Date.now,
  } = options;
  const startedAt = now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { state, deployError } = await fetchConsentManagerDeployState(client, { logger });

    if (ERROR_STATES.includes(state)) {
      throw new Error(
        `Consent manager deploy failed with state ${state}${deployError ? `: ${deployError}` : ''}`,
      );
    }
    if (!PENDING_STATES.includes(state)) {
      return state;
    }
    if (now() - startedAt + pollIntervalMs > timeoutMs) {
      throw new Error(
        `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the consent manager deploy to finish. Last state: ${state}`,
      );
    }
    logger?.info(`Consent manager state is ${state}. Checking again in ${pollIntervalMs}ms...`);
    await sleep(pollIntervalMs);
  }
}
