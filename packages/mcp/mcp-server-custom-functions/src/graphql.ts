import { TranscendGraphQLBase } from '@transcend-io/mcp-server-base';
import type {
  CustomFunctionLifecycleState,
  CustomFunctionPayloadType,
  CustomFunctionType,
  CustomFunctionVersionLifecycleState,
} from '@transcend-io/privacy-types';

import { graphql } from './__generated__/gql.js';

export type {
  CustomFunctionLifecycleState,
  CustomFunctionPayloadType,
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

const CreateCustomFunctionDoc = graphql(/* GraphQL */ `
  mutation CustomFunctionsCreate($input: CreateCustomFunctionInput!) {
    createCustomFunction(input: $input) {
      success
      customFunction {
        ...CustomFunctionsSummary
      }
    }
  }
`);

const UpdateCustomFunctionDoc = graphql(/* GraphQL */ `
  mutation CustomFunctionsUpdate($input: UpdateStandaloneCustomFunctionInput!) {
    updateStandaloneCustomFunction(input: $input) {
      success
      customFunction {
        ...CustomFunctionsSummary
      }
    }
  }
`);

const PromoteCustomFunctionVersionDoc = graphql(/* GraphQL */ `
  mutation CustomFunctionsPromote($input: PromoteCustomFunctionVersionInput!) {
    promoteCustomFunctionVersion(input: $input) {
      success
      customFunction {
        ...CustomFunctionsSummary
      }
      dependencyWarnings {
        dependencyType
        dependencyId
        dependencyTitle
        dependencyStatus
        message
      }
    }
  }
`);

const RunCustomFunctionDoc = graphql(/* GraphQL */ `
  mutation CustomFunctionsTestRun($input: RunCustomFunctionInput!) {
    runCustomFunction(input: $input) {
      result {
        profile {
          timeMs
        }
        logs {
          message
          file
        }
        error {
          message
          stack
        }
        exitCode
      }
    }
  }
`);

const ListSombrasDoc = graphql(/* GraphQL */ `
  query CustomFunctionsListSombras {
    sombras {
      id
      title
      customerUrl
      isPrimarySombra
    }
  }
`);

const CreateCustomFunctionDataSiloDoc = graphql(/* GraphQL */ `
  mutation CustomFunctionsCreateDataSilo($input: [CreateDataSilosInput!]!) {
    createDataSilos(input: $input) {
      dataSilos {
        id
        title
      }
    }
  }
`);

const DeleteDataSilosDoc = graphql(/* GraphQL */ `
  mutation CustomFunctionsDeleteDataSilos($input: DeleteDataSilosInput!) {
    deleteDataSilos(input: $input) {
      clientMutationId
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

export interface CustomFunctionDependencyWarning {
  /** Type of dependent resource */
  dependencyType: string;
  /** ID of dependent resource */
  dependencyId: string;
  /** Display title of dependent resource */
  dependencyTitle: string;
  /** Lifecycle state of dependent resource */
  dependencyStatus: string;
  /** Actionable warning text */
  message: string;
}

export interface CustomFunctionPromotionResult {
  /** Promoted custom function */
  customFunction: CustomFunctionSummary;
  /** Dependency warnings produced during promotion */
  dependencyWarnings: CustomFunctionDependencyWarning[];
}

export interface CustomFunctionExecutionResult {
  /** Process exit code */
  exitCode: number;
  /** Console output captured during execution */
  logs: {
    /** Log message */
    message: string;
    /** Source file */
    file: string;
  }[];
  /** Customer execution error, when execution failed */
  error?: {
    /** Error message */
    message: string;
    /** Optional stack trace */
    stack?: string;
  };
  /** Runtime profiling data */
  profile: {
    /** Total execution time in milliseconds */
    timeMs: number;
  };
}

export interface SombraSummary {
  /** Sombra gateway ID */
  id: string;
  /** Display title */
  title?: string;
  /** Customer-ingress URL */
  customerUrl: string;
  /** Whether this is the organization's primary Sombra */
  isPrimarySombra: boolean;
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

/**
 * Catalog integration name for DSR Custom Function data silos.
 * Keep in lockstep with packages/sdk/src/custom-functions/customFunctionDataSilo.ts.
 */
const CUSTOM_FUNCTION_INTEGRATION_NAME = 'customFunction';

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

  async createCustomFunction(input: {
    /** Function type */
    type: CustomFunctionType;
    /** Linked data silo ID for DSR */
    dataSiloId?: string;
    /** Execution gateway ID for GENERAL */
    sombraId?: string;
    /** Display name */
    name?: string;
    /** Optional description */
    description?: string;
    /** Whether a GENERAL function is active immediately */
    setActive?: boolean;
    /** Signed code JWT */
    signedCodeJwt: string;
    /** Signed context JWT */
    signedCodeContextJwt: string;
    /** Whether the signed code already passed a test run */
    successfulTestRun?: boolean;
  }): Promise<CustomFunctionSummary> {
    const data = await this.makeRequest(CreateCustomFunctionDoc, { input });
    return mapCustomFunction(data.createCustomFunction.customFunction);
  }

  async updateCustomFunction(input: {
    /** Custom function ID */
    id: string;
    /** Existing draft version ID to update */
    versionId?: string;
    /** New display name */
    name?: string;
    /** New description */
    description?: string;
    /** Signed code JWT */
    signedCodeJwt?: string;
    /** Signed context JWT */
    signedCodeContextJwt?: string;
    /** Whether the current version passed a test run */
    successfulTestRun?: boolean;
  }): Promise<CustomFunctionSummary> {
    const data = await this.makeRequest(UpdateCustomFunctionDoc, { input });
    return mapCustomFunction(data.updateStandaloneCustomFunction.customFunction);
  }

  async promoteCustomFunctionVersion(
    customFunctionId: string,
    versionId: string,
  ): Promise<CustomFunctionPromotionResult> {
    const data = await this.makeRequest(PromoteCustomFunctionVersionDoc, {
      input: { customFunctionId, versionId },
    });
    return {
      customFunction: mapCustomFunction(data.promoteCustomFunctionVersion.customFunction),
      dependencyWarnings: data.promoteCustomFunctionVersion.dependencyWarnings,
    };
  }

  async testRunCustomFunction(input: {
    /** Function type */
    type: CustomFunctionType;
    /** Stored custom function ID; binds the run in Activity */
    id?: string;
    /** Gateway ID for GENERAL functions */
    sombraId?: string;
    /** Base64-encoded JSON payload */
    payload: string;
    /** Optional DSR payload subtype */
    payloadType?: CustomFunctionPayloadType;
    /** Signed code JWT; omit when executing a stored function by id */
    signedCodeJwt?: string;
    /** Signed context JWT; omit when executing a stored function by id */
    signedCodeContextJwt?: string;
  }): Promise<CustomFunctionExecutionResult> {
    const { signedCodeJwt, signedCodeContextJwt, ...rest } = input;
    const data = await this.makeRequest(RunCustomFunctionDoc, {
      input: {
        ...rest,
        ...(signedCodeJwt !== undefined && signedCodeContextJwt !== undefined
          ? { signedCodeJwt, signedCodeContextJwt }
          : {}),
        isCustomFunctionTestRun: true,
      },
    });
    const error = data.runCustomFunction.result.error;
    return {
      exitCode: data.runCustomFunction.result.exitCode,
      logs: data.runCustomFunction.result.logs,
      error: error
        ? {
            message: error.message,
            stack: error.stack ?? undefined,
          }
        : undefined,
      profile: {
        timeMs: data.runCustomFunction.result.profile.timeMs,
      },
    };
  }

  async listSombras(): Promise<SombraSummary[]> {
    const data = await this.makeRequest(ListSombrasDoc, {});
    return data.sombras.map((sombra) => ({
      id: sombra.id,
      title: sombra.title ?? undefined,
      customerUrl: sombra.customerUrl,
      isPrimarySombra: sombra.isPrimarySombra,
    }));
  }

  async createCustomFunctionDataSilo(input: {
    /** Display title, conventionally the custom function name */
    title: string;
    /** Sombra gateway the DSR function will execute on */
    sombraId: string;
  }): Promise<{
    /** Created data silo ID */
    id: string;
    /** Created data silo title */
    title: string;
  }> {
    const data = await this.makeRequest(CreateCustomFunctionDataSiloDoc, {
      input: [
        {
          name: CUSTOM_FUNCTION_INTEGRATION_NAME,
          title: input.title,
          sombraId: input.sombraId,
        },
      ],
    });
    const dataSilo = data.createDataSilos.dataSilos[0];
    if (!dataSilo) {
      throw new Error(`Failed to create a Custom Function data silo titled "${input.title}".`);
    }
    return { id: dataSilo.id, title: dataSilo.title };
  }

  async deleteDataSilo(dataSiloId: string): Promise<void> {
    await this.makeRequest(DeleteDataSilosDoc, { input: { ids: [dataSiloId] } });
  }
}
