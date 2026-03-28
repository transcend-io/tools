import {
  buildTranscendGraphQLClient as sdkBuildClient,
  buildTranscendGraphQLClientGeneric as sdkBuildClientGeneric,
} from '@transcend-io/sdk';
import type { GraphQLClient } from 'graphql-request';

import { version } from '../../../package.json';

export function buildTranscendGraphQLClientGeneric(
  transcendUrl: string,
  headers: Record<string, string>,
): GraphQLClient {
  return sdkBuildClientGeneric(transcendUrl, headers, version);
}

export function buildTranscendGraphQLClient(transcendUrl: string, auth: string): GraphQLClient {
  return sdkBuildClient(transcendUrl, auth, version);
}
