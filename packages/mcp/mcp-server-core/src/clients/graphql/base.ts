import { ToolError, ErrorCode, classifyHttpError } from '../../errors.js';
import type { RequestOptions } from '../../types/transcend.js';

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export class SimpleLogger implements Logger {
  debug(message: string, data?: unknown): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.error(
        JSON.stringify({ level: 'debug', message, data, timestamp: new Date().toISOString() }),
      );
    }
  }
  info(message: string, data?: unknown): void {
    console.error(
      JSON.stringify({ level: 'info', message, data, timestamp: new Date().toISOString() }),
    );
  }
  warn(message: string, data?: unknown): void {
    console.error(
      JSON.stringify({ level: 'warn', message, data, timestamp: new Date().toISOString() }),
    );
  }
  error(message: string, data?: unknown): void {
    console.error(
      JSON.stringify({ level: 'error', message, data, timestamp: new Date().toISOString() }),
    );
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
}

export class TranscendGraphQLBase {
  protected apiKey: string;
  protected baseUrl: string;
  protected logger: Logger;
  protected defaultTimeout: number;
  protected defaultRetries: number;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 200;

  constructor(apiKey: string, baseUrl: string = 'https://api.transcend.io', logger?: Logger) {
    this.apiKey = apiKey;
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

  protected async makeRequest<T>(
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

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
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
