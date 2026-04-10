import got, { type Got } from 'got';

/**
 * Instantiate an instance of got that is capable of making requests
 * to a sombra gateway.
 *
 * @param transcendUrl - URL of Transcend API
 * @returns The instance of got that is capable of making requests to the customer ingress
 */
export function createTranscendConsentGotInstance(transcendUrl: string): Got {
  return (got as unknown as Got).extend({
    prefixUrl: transcendUrl,
  });
}
