import { getRequestAuth } from '../../auth-context.js';
import { type AuthCredentials, authHeaders } from '../../auth.js';
import { DEFAULT_TRANSCEND_API_URL } from '../../defaults.js';
import { ToolError, ErrorCode, classifyHttpError } from '../../errors.js';
import { MCP_CALLER_HEADER, TOOLCALL_ID_HEADER } from '../../http-header-names.js';
import { getRequestMcpCaller } from '../../mcp-caller-context.js';
import { getToolCallIdHeader } from '../../tool-call-context.js';
import type { PaginatedResponse, RequestOptions } from '../../types/transcend.js';
import { TRANSCEND_MCP_USER_AGENT } from '../mcp-user-agent.js';

/**
 * Structurally identical to the `Logger` interface in `@transcend-io/utils`,
 * declared locally to avoid pulling that package's transitive dependencies
 * (bluebird, csv-parse, fp-ts, ...) into the published MCP packages.
 *
 * Because TypeScript is structural, instances are interchangeable with utils'
 * `Logger` at zero runtime cost and zero call-site changes.
 */
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Join a log prefix with an Error message for human-readable output. */
function formatErrorLogMessage(prefix: string, error: Error): string {
  const trimmedPrefix = prefix.trimEnd();
  if (!trimmedPrefix) {
    return error.message;
  }
  if (trimmedPrefix.endsWith(':')) {
    return `${trimmedPrefix} ${error.message}`;
  }
  return `${trimmedPrefix}: ${error.message}`;
}

export class SimpleLogger implements Logger {
  private static useStdoutForInfo = false;

  /**
   * Route info/debug to stdout. Call once at server startup when running
   * in HTTP transport so log collectors (Datadog, Fluent Bit, ...) classify
   * informational logs correctly instead of tagging everything from stderr
   * as Error. Must NOT be enabled in stdio MCP mode -- stdout is reserved
   * for JSON-RPC protocol frames.
   */
  static setInfoToStdout(enabled: boolean): void {
    SimpleLogger.useStdoutForInfo = enabled;
  }

  private write(level: LogLevel, message: string, data?: unknown): void {
    let logMessage = message;
    let logData: unknown;

    if (data instanceof Error) {
      logMessage = formatErrorLogMessage(message, data);
      if (process.env.LOG_LEVEL === 'debug' && data.stack) {
        logData = { stack: data.stack };
      }
    } else if (data !== undefined) {
      logData = data;
    }

    const line = JSON.stringify({
      level,
      message: logMessage,
      ...(logData !== undefined ? { data: logData } : {}),
      timestamp: new Date().toISOString(),
    });
    const useStdout = SimpleLogger.useStdoutForInfo && (level === 'info' || level === 'debug');
    (useStdout ? process.stdout : process.stderr).write(`${line}\n`);
  }

  debug(message: string, data?: unknown): void {
    if (process.env.LOG_LEVEL === 'debug') this.write('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.write('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.write('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    // Stdio MCP mode: plain-text errors are easier to read in Cursor than JSON blobs.
    if (!SimpleLogger.useStdoutForInfo && data instanceof Error) {
      process.stderr.write(`${formatErrorLogMessage(message, data)}\n`);
      if (process.env.LOG_LEVEL === 'debug' && data.stack) {
        process.stderr.write(`${data.stack}\n`);
      }
      return;
    }
    this.write('error', message, data);
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
}

export interface ListOptions {
  first?: number;
  after?: string;
  offset?: number;
  filterBy?: Record<string, unknown>;
  orderBy?: string;
  /**
   * Fetch every page instead of a single one. When set, `first`/`offset` are
   * ignored and the full result set is returned via offset pagination (see
   * {@link TranscendGraphQLBase.fetchAllPages}).
   */
  all?: boolean;
}

export class TranscendGraphQLBase {
  protected auth: AuthCredentials | null;
  protected baseUrl: string;
  protected logger: Logger;
  protected defaultTimeout: number;
  protected defaultRetries: number;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 200;

  constructor(
    auth: AuthCredentials | null,
    baseUrl: string = DEFAULT_TRANSCEND_API_URL,
    logger?: Logger,
  ) {
    this.auth = auth;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.logger = logger || new SimpleLogger();
    this.defaultTimeout = 30000;
    this.defaultRetries = 3;
  }

  private async rateLimitWait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  async makeRequest<T>(
    query: string,
    variables?: Record<string, unknown>,
    options: RequestOptions = {},
  ): Promise<T> {
    await this.rateLimitWait();

    const url = `${this.baseUrl}/graphql`;
    const { timeout = this.defaultTimeout, retries = this.defaultRetries } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.logger.debug('GraphQL request', {
          url,
          operationType: query.includes('mutation') ? 'mutation' : 'query',
          attempt,
        });

        const effectiveAuth = getRequestAuth() ?? this.auth;
        if (!effectiveAuth) {
          throw new ToolError(
            ErrorCode.AUTH_ERROR,
            'No authentication configured. Provide an API key or session cookie.',
            false,
          );
        }

        const toolCallId = getToolCallIdHeader();
        const mcpCaller = getRequestMcpCaller();
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            ...authHeaders(effectiveAuth),
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': TRANSCEND_MCP_USER_AGENT,
            ...(toolCallId && { [TOOLCALL_ID_HEADER]: toolCallId }),
            ...(mcpCaller && { [MCP_CALLER_HEADER]: mcpCaller }),
          },
          body: JSON.stringify({ query, variables: variables || {} }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const httpError = classifyHttpError(response.status, errorText);

          if (!httpError.retryable) {
            throw httpError;
          }

          lastError = httpError;

          if (attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw httpError;
        }

        const result: GraphQLResponse<T> = (await response.json()) as GraphQLResponse<T>;

        if (result.errors && result.errors.length > 0) {
          const errorMessages = result.errors.map((e) => e.message).join('; ');
          throw new ToolError(ErrorCode.API_ERROR, `GraphQL errors: ${errorMessages}`, false);
        }

        if (!result.data) {
          throw new ToolError(ErrorCode.API_ERROR, 'GraphQL response missing data', false);
        }

        return result.data;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          throw new ToolError(
            ErrorCode.TIMEOUT,
            `GraphQL request timeout after ${timeout}ms`,
            true,
          );
        }

        if (error instanceof ToolError) {
          lastError = error;
          if (!error.retryable) throw error;
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        if (attempt < retries && (lastError instanceof ToolError ? lastError.retryable : true)) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('GraphQL request failed after all retries');
  }

  /**
   * Fetch every page of an offset-paginated GraphQL connection through
   * {@link makeRequest}, so paginated reads inherit the same per-request auth,
   * proactive rate-limit throttle, timeout, retry, and `ToolError`
   * classification as every other call.
   *
   * `query` MUST accept `$first`/`$offset` variables and select a single
   * connection of shape `{ nodes, totalCount }` under `connectionKey`. Extra
   * static variables (e.g. `filterBy`) can be supplied via `variables`.
   *
   * @param query - GraphQL query with `$first`/`$offset` variables
   * @param connectionKey - Top-level field holding the `{ nodes, totalCount }` connection
   * @param variables - Additional static variables merged into every page request
   * @param pageSize - Records fetched per page
   * @returns Every node across all pages
   */
  protected async fetchAllPages<TNode>(
    query: string,
    connectionKey: string,
    variables: Record<string, unknown> = {},
    pageSize = 100,
  ): Promise<TNode[]> {
    const all: TNode[] = [];
    let offset = 0;

    for (;;) {
      const data = await this.makeRequest<Record<string, { nodes: TNode[]; totalCount: number }>>(
        query,
        { ...variables, first: pageSize, offset },
      );

      const connection = data[connectionKey];
      const nodes = connection?.nodes ?? [];
      all.push(...nodes);
      offset += nodes.length;

      // Stop on an empty/short page, or once we've consumed everything the
      // server reports. The `offset >= totalCount` check also guards against a
      // backend that ignores `offset`: offset keeps growing, so we never loop
      // forever (the failure mode that broke cursor-style pagination before).
      if (
        nodes.length === 0 ||
        nodes.length < pageSize ||
        offset >= (connection?.totalCount ?? 0)
      ) {
        break;
      }
    }

    return all;
  }

  /**
   * Run an offset-paginated `list*` query and shape it into a
   * {@link PaginatedResponse}. With `options.all` it returns every page (via
   * {@link fetchAllPages}); otherwise it returns a single page with
   * offset-derived `pageInfo`. This is the shared engine behind the inventory
   * `list*` methods — they only supply the query, the connection key, and an
   * optional node mapper.
   *
   * The `query` MUST accept `$first`/`$offset` and select a single connection
   * `{ nodes, totalCount }` under `connectionKey`.
   *
   * @param query - GraphQL query with `$first`/`$offset` variables
   * @param connectionKey - Top-level field holding the `{ nodes, totalCount }` connection
   * @param options - Pagination options (`first`/`offset`, or `all` to fetch everything)
   * @param config - Optional node mapper and extra static variables (e.g. `filterBy`)
   * @returns A paginated response of (optionally mapped) nodes
   */
  protected async listConnection<TNode, TOut = TNode>(
    query: string,
    connectionKey: string,
    options?: ListOptions,
    config: {
      /** Maps each raw node to the response shape (defaults to identity). */
      mapNode?: (node: TNode) => TOut;
      /** Static variables merged into the request (e.g. a fixed `filterBy`). */
      variables?: Record<string, unknown>;
    } = {},
  ): Promise<PaginatedResponse<TOut>> {
    const { mapNode = (node: TNode) => node as unknown as TOut, variables = {} } = config;

    if (options?.all) {
      const nodes = (await this.fetchAllPages<TNode>(query, connectionKey, variables)).map(mapNode);
      return {
        nodes,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: nodes.length,
      };
    }

    const offset = options?.offset ?? 0;
    const data = await this.makeRequest<Record<string, { nodes: TNode[]; totalCount: number }>>(
      query,
      { ...variables, first: Math.min(options?.first || 100, 100), offset },
    );

    const connection = data[connectionKey];
    const rawNodes = connection?.nodes ?? [];
    const totalCount = connection?.totalCount ?? 0;
    return {
      nodes: rawNodes.map(mapNode),
      pageInfo: {
        hasNextPage: offset + rawNodes.length < totalCount,
        hasPreviousPage: offset > 0,
      },
      totalCount,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest<{ __typename: string }>('query { __typename }');
      return true;
    } catch (error) {
      this.logger.error('GraphQL connection test failed', error);
      return false;
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
