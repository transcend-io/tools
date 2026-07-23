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

const ORGANIZATION_SOMBRA_CUSTOMER_URL_QUERY = `
  query McpOrganizationSombraCustomerUrl {
    organization {
      sombra {
        customerUrl
      }
    }
  }
`;

export interface OrganizationSombraContext {
  /** Customer ingress URL from `organization.sombra.customerUrl` */
  customerUrl: string | null | undefined;
}

export interface ResolveSombraUrlOptions {
  /** Sticky host override (e.g. from `SOMBRA_URL`). When set, customerUrl is not required. */
  sombraUrlOverride?: string;
  /** `organization.sombra.customerUrl` when no override is set */
  customerUrl?: string | null;
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
 * GraphQL-fetches the Sombra customer URL for the authenticated org.
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
    };
  }>(ORGANIZATION_SOMBRA_CUSTOMER_URL_QUERY);

  const organization = data.organization;
  return {
    customerUrl: organization?.sombra?.customerUrl,
  };
}

/**
 * Resolves the sticky Sombra host.
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
 * (sticky) and optionally sends `X-Sombra-Authorization`.
 *
 * The host itself is resolved once. Pass `assertReady` via a follow-up when org
 * AiSettings gating is required.
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
    logger: options.logger,
  });
}
