import {
  FormType,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
  RegionDetectionMethod,
  RequestAction,
} from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { ACTIONS } from './gqls/action.js';

export interface ActionFormItem {
  /** Internal name of the form field */
  name: string;
  /** Display order */
  index?: number | null;
  /** Field type */
  type?: FormType | null;
  /** Whether the field is required */
  isRequired: boolean;
  /** Accepted MIME types for file uploads */
  acceptedMimeTypes?: string[] | null;
  /** Max file size */
  maxFileSize?: string | null;
  /** Max files */
  maxFiles?: number | null;
  /** Field label */
  label?: { defaultMessage: string };
  /** Help text */
  info?: { defaultMessage: string } | null;
}

export interface Action {
  /** ID of identifier */
  id: string;
  /** Type of action */
  type: RequestAction;
  /** Default locale title */
  title?: { defaultMessage: string };
  /** Default locale description */
  description?: { defaultMessage: string };
  /** Privacy center form fields */
  formItems?: ActionFormItem[];
  /** Whether to skip secondary when no files exist */
  skipSecondaryIfNoFiles: boolean;
  /** Whether to skip downloadable step */
  skipDownloadableStep: boolean;
  /** Whether action requires review */
  requiresReview: boolean;
  /** Waiting period for action */
  waitingPeriod: number;
  /** Method in which the data subject's region is detected */
  regionDetectionMethod: RegionDetectionMethod;
  /** The list of regions to show in the form */
  regionList: (IsoCountryCode | IsoCountrySubdivisionCode)[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all actions in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All actions in the organization
 */
export async function fetchAllActions(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<Action[]> {
  const { logger } = options;
  const actions: Action[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      actions: { nodes },
    } = await makeGraphQLRequest<{
      /** Actions */
      actions: {
        /** List */
        nodes: Action[];
      };
    }>(client, ACTIONS, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    actions.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return actions.sort((a, b) => a.type.localeCompare(b.type));
}
