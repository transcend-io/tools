import { TranscendGraphQLBase } from '@transcend-io/mcp-server-base';
import type {
  CustomFunctionLifecycleState,
  CustomFunctionType,
  CustomFunctionVersionLifecycleState,
} from '@transcend-io/privacy-types';

import { graphql } from './__generated__/gql.js';

export type {
  CustomFunctionLifecycleState,
  CustomFunctionType,
  CustomFunctionVersionLifecycleState,
};

const CustomFunctionFields = graphql(/* GraphQL */ `
  fragment CustomFunctionsSummary on CustomFunction {
    id
    name
    description
    lifecycleState
    type
    sombraId
    dataSiloId
    hasPendingDraft
    activeVersion {
      id
      versionNumber
      lifecycleState
      successfulTestRun
    }
    draftVersion {
      id
      versionNumber
      lifecycleState
      successfulTestRun
    }
  }
`);

const ListCustomFunctionsDoc = graphql(/* GraphQL */ `
  query CustomFunctionsList($first: Int, $offset: Int, $filterBy: CustomFunctionFilterInput) {
    customFunctions(first: $first, offset: $offset, filterBy: $filterBy) {
      nodes {
        ...CustomFunctionsSummary
      }
      totalCount
    }
  }
`);

const GetCustomFunctionCodeDoc = graphql(/* GraphQL */ `
  query CustomFunctionsGetCode($filterBy: CustomFunctionFilterInput) {
    customFunctions(first: 1, filterBy: $filterBy) {
      nodes {
        ...CustomFunctionsSummary
        signedCodeJwt
        signedCodeContextJwt
      }
    }
  }
`);

void CustomFunctionFields;

export interface CustomFunctionVersionSummary {
  /** Version ID */
  id: string;
  /** Human-readable version number */
  versionNumber: string;
  /** Version lifecycle state */
  lifecycleState: CustomFunctionVersionLifecycleState;
  /** Whether this version has completed a successful test run */
  successfulTestRun: boolean;
}

export interface CustomFunctionSummary {
  /** Custom function ID */
  id: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Function lifecycle state */
  lifecycleState: CustomFunctionLifecycleState;
  /** Function type */
  type: CustomFunctionType;
  /** Sombra gateway ID used for execution */
  sombraId?: string;
  /** Linked data silo ID for DSR functions */
  dataSiloId?: string;
  /** Whether a newer draft is waiting for promotion */
  hasPendingDraft: boolean;
  /** Active version, when one exists */
  activeVersion?: CustomFunctionVersionSummary;
  /** Pending draft version, when one exists */
  draftVersion?: CustomFunctionVersionSummary;
}

export interface CustomFunctionListResult {
  /** Custom functions on this page */
  nodes: CustomFunctionSummary[];
  /** Total matching custom functions */
  totalCount: number;
  /** Whether another offset page exists */
  hasNextPage: boolean;
}

export interface SignedCustomFunctionVersion {
  /** Public custom function metadata */
  customFunction: CustomFunctionSummary;
  /** Version selected by the API for the signed JWT pair */
  version: CustomFunctionVersionSummary;
  /** Signed code JWT, for internal customer-ingress use only */
  signedCodeJwt: string;
  /** Signed context JWT, for internal customer-ingress use only */
  signedCodeContextJwt: string;
}

interface RawCustomFunctionVersion {
  /** Version ID */
  id: string;
  /** Human-readable version number */
  versionNumber: string;
  /** Version lifecycle state */
  lifecycleState: CustomFunctionVersionLifecycleState;
  /** Whether this version has completed a successful test run */
  successfulTestRun: boolean;
}

interface RawCustomFunction {
  /** Custom function ID */
  id: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string | null;
  /** Function lifecycle state */
  lifecycleState: CustomFunctionLifecycleState;
  /** Function type */
  type: CustomFunctionType;
  /** Sombra gateway ID used for execution */
  sombraId?: string | null;
  /** Linked data silo ID for DSR functions */
  dataSiloId?: string | null;
  /** Whether a newer draft is waiting for promotion */
  hasPendingDraft: boolean;
  /** Active version, when one exists */
  activeVersion?: RawCustomFunctionVersion | null;
  /** Pending draft version, when one exists */
  draftVersion?: RawCustomFunctionVersion | null;
}

function mapVersion(
  version: RawCustomFunctionVersion | null | undefined,
): CustomFunctionVersionSummary | undefined {
  return version
    ? {
        id: version.id,
        versionNumber: version.versionNumber,
        lifecycleState: version.lifecycleState,
        successfulTestRun: version.successfulTestRun,
      }
    : undefined;
}

function mapCustomFunction(customFunction: RawCustomFunction): CustomFunctionSummary {
  return {
    id: customFunction.id,
    name: customFunction.name,
    description: customFunction.description ?? undefined,
    lifecycleState: customFunction.lifecycleState,
    type: customFunction.type,
    sombraId: customFunction.sombraId ?? undefined,
    dataSiloId: customFunction.dataSiloId ?? undefined,
    hasPendingDraft: customFunction.hasPendingDraft,
    activeVersion: mapVersion(customFunction.activeVersion),
    draftVersion: mapVersion(customFunction.draftVersion),
  };
}

export class CustomFunctionsMixin extends TranscendGraphQLBase {
  async listCustomFunctions(options: {
    /** Maximum results to return */
    first: number;
    /** Results to skip */
    offset: number;
    /** Optional function type */
    type?: CustomFunctionType;
    /** Optional lifecycle state */
    lifecycleState?: CustomFunctionLifecycleState;
    /** Optional linked data silo ID */
    dataSiloId?: string;
    /** Optional text search */
    text?: string;
  }): Promise<CustomFunctionListResult> {
    const data = await this.makeRequest(ListCustomFunctionsDoc, {
      first: options.first,
      offset: options.offset,
      filterBy: {
        type: options.type,
        lifecycleState: options.lifecycleState,
        dataSiloId: options.dataSiloId,
        text: options.text,
      },
    });
    const nodes = data.customFunctions.nodes.map(mapCustomFunction);
    return {
      nodes,
      totalCount: data.customFunctions.totalCount,
      hasNextPage: options.offset + nodes.length < data.customFunctions.totalCount,
    };
  }

  async getSignedCustomFunctionVersion(
    id: string,
    versionId?: string,
  ): Promise<SignedCustomFunctionVersion> {
    const data = await this.makeRequest(GetCustomFunctionCodeDoc, {
      filterBy: { id },
    });
    const node = data.customFunctions.nodes[0];
    if (!node) {
      throw new Error(`No custom function found with id ${id}.`);
    }

    const selectedVersion = node.activeVersion ?? node.draftVersion;
    if (!selectedVersion) {
      throw new Error(`Custom function ${id} has no readable version.`);
    }
    if (versionId && selectedVersion.id !== versionId) {
      throw new Error(
        `Version ${versionId} cannot be read through the current GraphQL API. ` +
          `The readable version for custom function ${id} is ${selectedVersion.id}.`,
      );
    }

    return {
      customFunction: mapCustomFunction(node),
      version: mapVersion(selectedVersion)!,
      signedCodeJwt: node.signedCodeJwt,
      signedCodeContextJwt: node.signedCodeContextJwt,
    };
  }
}
