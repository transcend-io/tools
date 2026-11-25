import type { AuthCredentials } from '../auth.js';
import type { Logger, TranscendGraphQLBase } from '../clients/graphql/base.js';
import { TranscendRestClient } from '../clients/rest-client.js';

/** Environment variable for a sticky Sombra host override. */
export const SOMBRA_URL_ENV = 'SOMBRA_URL';

/** Environment variable for the optional Sombra customer-ingress API key. */
export const SOMBRA_CUSTOMER_KEY_ENV = 'SOMBRA_CUSTOMER_KEY';

/** Reverse-tunnel placeholders that mean customer ingress is not configured. */
export const SOMBRA_REVERSE_TUNNEL_URLS = [
  'https://sombra-reverse-tunnel.transcend.io',
  'https://sombra-reverse-tunnel.us.transcend.io',
] as const;

const SOMBRA_NETWORKING_DOCS_URL =
  'https://docs.transcend.io/docs/articles/sombra/deploying/customizing-sombra/networking';

const AI_SETTINGS_DOCS_HINT =
  'Enable AI and MCP × Sombra under Administration → AI Settings in the Transcend Admin Dashboard.';

const ORGANIZATION_SOMBRA_CONTEXT_QUERY = `
  query McpOrganizationSombraContext {
    organization {
      sombra {
        customerUrl
      }
      aiSetting {
        isAiEnabled
        isMcpSombraEnabled
      }
    }
  }
`;

export interface OrganizationAiSetting {
  /** Whether AI-powered features are enabled for this organization */
  isAiEnabled: boolean;
  /** Whether MCP may use Sombra-backed tools for this organization */
  isMcpSombraEnabled: boolean;
}

export interface OrganizationSombraContext {
  /** Customer ingress URL from `organization.sombra.customerUrl` */
  customerUrl: string | null | undefined;
  /** Org AI / MCP × Sombra settings */
  aiSetting: OrganizationAiSetting;
}

export interface ResolveSombraUrlOptions {
  /** Sticky host override (e.g. from `SOMBRA_URL`). When set, customerUrl is not required. */
  sombraUrlOverride?: string;
  /** `organization.sombra.customerUrl` when no override is set */
  customerUrl?: string | null;
}

/**
 * Enforces org AiSettings before MCP may call Sombra.
 * Fail-closed when either flag is false or missing.
 */
export function assertMcpSombraAiSettings(
  aiSetting: OrganizationAiSetting | null | undefined,
): void {
  if (!aiSetting?.isAiEnabled) {
    throw new Error(
      'AI features are disabled for this organization, so MCP cannot call Sombra. ' +
        AI_SETTINGS_DOCS_HINT,
    );
  }
  if (!aiSetting.isMcpSombraEnabled) {
    throw new Error('MCP × Sombra is disabled for this organization. ' + AI_SETTINGS_DOCS_HINT);
  }
}

/**
 * Resolves the Sombra customer-ingress base URL from an override or customerUrl.
 *
 * Prefer a sticky `SOMBRA_URL` override; otherwise use `customerUrl`. Throws
 * actionable errors when the URL is missing or still a reverse-tunnel placeholder.
 */
export function resolveSombraUrl(options: ResolveSombraUrlOptions): string {
  const override = options.sombraUrlOverride?.trim();
  if (override) {
    return override.replace(/\/$/, '');
  }

  const customerUrl = options.customerUrl?.trim();
  if (!customerUrl) {
    throw new Error(
      'Your organization does not have a Sombra customer URL configured. ' +
        `Set ${SOMBRA_URL_ENV}, or configure the Sombra customer ingress URL in the Admin Dashboard. ` +
        `See ${SOMBRA_NETWORKING_DOCS_URL}`,
    );
  }

  if ((SOMBRA_REVERSE_TUNNEL_URLS as readonly string[]).includes(customerUrl)) {
    throw new Error(
      'It looks like your Sombra customer ingress URL has not been set up. ' +
        'Please follow the instructions here to configure networking for Sombra: ' +
        SOMBRA_NETWORKING_DOCS_URL,
    );
  }

  return customerUrl.replace(/\/$/, '');
}

/**
 * GraphQL-fetches Sombra customer URL and AiSettings for the authenticated org.
 */
export async function fetchOrganizationSombraContext(
  graphql: TranscendGraphQLBase,
): Promise<OrganizationSombraContext> {
  const data = await graphql.makeRequest<{
    /** Organization */
    organization: {
      /** Primary Sombra */
      sombra: {
        /** Customer ingress URL */
        customerUrl: string;
      };
      /** AI feature settings */
      aiSetting: OrganizationAiSetting | null;
    };
  }>(ORGANIZATION_SOMBRA_CONTEXT_QUERY);

  const organization = data.organization;
  return {
    customerUrl: organization?.sombra?.customerUrl,
    aiSetting: {
      isAiEnabled: organization?.aiSetting?.isAiEnabled === true,
      isMcpSombraEnabled: organization?.aiSetting?.isMcpSombraEnabled === true,
    },
  };
}

/**
 * Fetches org Sombra context, enforces AiSettings, and resolves the sticky host.
 *
 * Prefer {@link createTranscendRestClient}, which keeps the host sticky but
 * re-checks AiSettings on every Sombra call.
 */
export async function resolveSombraHostForMcp(
  graphql: TranscendGraphQLBase,
  options: {
    /** Sticky host override from `SOMBRA_URL` */
    sombraUrlOverride?: string;
  } = {},
): Promise<string> {
  const context = await fetchOrganizationSombraContext(graphql);
  assertMcpSombraAiSettings(context.aiSetting);
  return resolveSombraUrl({
    sombraUrlOverride: options.sombraUrlOverride,
    customerUrl: context.customerUrl,
  });
}

/**
 * Resolves the sticky Sombra host without checking AiSettings.
 *
 * When `sombraUrlOverride` is set, skips GraphQL. Otherwise fetches
 * `organization.sombra.customerUrl`.
 */
export async function resolveSombraHostUrl(
  graphql: TranscendGraphQLBase,
  options: {
    /** Sticky host override from `SOMBRA_URL` */
    sombraUrlOverride?: string;
  } = {},
): Promise<string> {
  const override = options.sombraUrlOverride?.trim();
  if (override) {
    return resolveSombraUrl({ sombraUrlOverride: override });
  }
  const context = await fetchOrganizationSombraContext(graphql);
  return resolveSombraUrl({ customerUrl: context.customerUrl });
}

/**
 * Fetches and enforces org AiSettings for MCP × Sombra (fail-closed).
 */
export async function assertOrganizationMcpSombraEnabled(
  graphql: TranscendGraphQLBase,
): Promise<void> {
  const context = await fetchOrganizationSombraContext(graphql);
  assertMcpSombraAiSettings(context.aiSetting);
}

/**
 * Reads optional Sombra env overrides from `process.env`.
 */
export function readSombraEnvConfig(): {
  /** Sticky host override from `SOMBRA_URL` */
  sombraUrl?: string;
  /** Customer key from `SOMBRA_CUSTOMER_KEY` */
  sombraCustomerKey?: string;
} {
  const sombraUrl = process.env[SOMBRA_URL_ENV]?.trim() || undefined;
  const sombraCustomerKey = process.env[SOMBRA_CUSTOMER_KEY_ENV]?.trim() || undefined;
  return { sombraUrl, sombraCustomerKey };
}

/**
 * Builds a Sombra REST client that lazy-resolves the customer host via GraphQL
 * (sticky), re-checks org AiSettings on every Sombra call, and optionally sends
 * `X-Sombra-Authorization`.
 *
 * AiSettings GraphQL runs on each REST call even when `SOMBRA_URL` is set as a
 * sticky host override. The host itself is resolved once.
 */
export function createTranscendRestClient(
  auth: AuthCredentials | null,
  graphql: TranscendGraphQLBase,
  options: {
    /** Sticky host override from `SOMBRA_URL` */
    sombraUrl?: string;
    /** Customer key from `SOMBRA_CUSTOMER_KEY` */
    sombraCustomerKey?: string;
    /** Logger instance */
    logger?: Logger;
  } = {},
): TranscendRestClient {
  const override = options.sombraUrl?.trim() || undefined;
  return new TranscendRestClient(auth, {
    sombraCustomerKey: options.sombraCustomerKey?.trim() || undefined,
    resolveBaseUrl: () => resolveSombraHostUrl(graphql, { sombraUrlOverride: override }),
    assertReady: () => assertOrganizationMcpSombraEnabled(graphql),
    logger: options.logger,
  });
}
