import { getRequestAuth } from '../auth-context.js';
import { type AuthCredentials, authHeaders } from '../auth.js';
import {
  MCP_CALLER_HEADER,
  SOMBRA_AUTHORIZATION_HEADER,
  TOOLCALL_ID_HEADER,
  TRANSCEND_VERSION_HEADER,
  TRANSCEND_VERSION_HEADER_VALUE,
} from '../http-header-names.js';
import { getRequestMcpCaller } from '../mcp-caller-context.js';
import { getToolCallIdHeader } from '../tool-call-context.js';
import type {
  DSRSubmission,
  DSRResponse,
  DownloadKey,
  EnrichIdentifiersInput,
  AccessResponseInput,
  ErasureResponseInput,
  PreferenceQueryInput,
  PreferenceUpsertInput,
  UserPreferences,
  LLMClassificationInput,
  LLMClassificationResult,
  NERExtractionInput,
  NERExtractionResult,
  RequestOptions,
} from '../types/transcend.js';
import { SimpleLogger, type Logger } from './graphql/base.js';
import { TRANSCEND_MCP_USER_AGENT } from './mcp-user-agent.js';

export interface TranscendRestClientOptions {
  /**
   * Sticky Sombra host override (e.g. from `SOMBRA_URL`).
   * When set, GraphQL customerUrl lookup is skipped.
   */
  baseUrl?: string;
  /**
   * Optional Sombra customer-ingress API key.
   * Sent as `X-Sombra-Authorization: Bearer …` when present.
   */
  sombraCustomerKey?: string;
  /**
   * Lazy host resolver used when {@link baseUrl} is unset.
   * Invoked once; the result is sticky for the client lifetime.
   */
  resolveBaseUrl?: () => Promise<string>;
  /**
   * Gate checked before every Sombra HTTP call (not sticky).
   * Use for org AiSettings / MCP × Sombra enablement.
   */
  assertReady?: () => Promise<void>;
  /** Logger instance */
  logger?: Logger;
}

export class TranscendRestClient {
  private auth: AuthCredentials | null;
  private baseUrl: string | null;
  private readonly sombraCustomerKey: string | undefined;
  private readonly resolveBaseUrl: (() => Promise<string>) | undefined;
  private readonly assertReady: (() => Promise<void>) | undefined;
  private resolvePromise: Promise<string> | null = null;
  private logger: Logger;
  private defaultTimeout: number;
  private defaultRetries: number;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 200;

  /**
   * @param auth - Default credentials (may be overridden per-request via ALS)
   * @param baseUrlOrOptions - Sticky base URL string, or options with lazy resolve
   * @param logger - Optional logger when the second argument is a base URL string
   */
  constructor(
    auth: AuthCredentials | null,
    baseUrlOrOptions: string | TranscendRestClientOptions = {},
    logger?: Logger,
  ) {
    this.auth = auth;

    if (typeof baseUrlOrOptions === 'string') {
      this.baseUrl = baseUrlOrOptions.replace(/\/$/, '');
      this.sombraCustomerKey = undefined;
      this.resolveBaseUrl = undefined;
      this.assertReady = undefined;
      this.logger = logger || new SimpleLogger();
    } else {
      const opts = baseUrlOrOptions;
      const trimmed = opts.baseUrl?.trim();
      this.baseUrl = trimmed ? trimmed.replace(/\/$/, '') : null;
      this.sombraCustomerKey = opts.sombraCustomerKey?.trim() || undefined;
      this.resolveBaseUrl = opts.resolveBaseUrl;
      this.assertReady = opts.assertReady;
      this.logger = opts.logger || logger || new SimpleLogger();
    }

    this.defaultTimeout = 30000;
    this.defaultRetries = 3;
  }

  /**
   * Runs the non-sticky readiness gate (e.g. org AiSettings), then ensures the
   * Sombra host is resolved. Host resolution remains sticky; the gate does not.
   */
  async prepareRequest(): Promise<string> {
    if (this.assertReady) {
      await this.assertReady();
    }
    return this.ensureResolved();
  }

  /**
   * Ensures the Sombra host is resolved and sticky.
   * Safe to call multiple times; only the first resolve runs.
   * Does not re-check org enablement — use {@link prepareRequest} for that.
   */
  async ensureResolved(): Promise<string> {
    if (this.baseUrl) {
      return this.baseUrl;
    }
    if (!this.resolveBaseUrl) {
      throw new Error(
        'Sombra URL is not configured. Set SOMBRA_URL or provide a GraphQL-backed host resolver.',
      );
    }
    if (!this.resolvePromise) {
      this.resolvePromise = this.resolveBaseUrl().then((url) => {
        this.baseUrl = url.replace(/\/$/, '');
        this.logger.info(`Using sombra: ${this.baseUrl}`);
        return this.baseUrl;
      });
    }
    return this.resolvePromise;
  }

  private sombraAuthHeaders(): Record<string, string> {
    if (!this.sombraCustomerKey) {
      return {};
    }
    return {
      [SOMBRA_AUTHORIZATION_HEADER]: `Bearer ${this.sombraCustomerKey}`,
    };
  }

  private async rateLimitWait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & RequestOptions = {},
  ): Promise<T> {
    const effectiveAuth = getRequestAuth() ?? this.auth;
    if (!effectiveAuth) {
      throw new Error('No authentication configured. Provide an API key or session cookie.');
    }

    const baseUrl = await this.prepareRequest();
    await this.rateLimitWait();

    const url = `${baseUrl}${endpoint}`;
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      ...fetchOptions
    } = options;

    const toolCallId = getToolCallIdHeader();
    const mcpCaller = getRequestMcpCaller();
    const headers: Record<string, string> = {
      ...authHeaders(effectiveAuth),
      ...this.sombraAuthHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      [TRANSCEND_VERSION_HEADER]: TRANSCEND_VERSION_HEADER_VALUE,
      ...((options.headers as Record<string, string>) || {}),
      'User-Agent': TRANSCEND_MCP_USER_AGENT,
      ...(toolCallId && { [TOOLCALL_ID_HEADER]: toolCallId }),
      ...(mcpCaller && { [MCP_CALLER_HEADER]: mcpCaller }),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`REST request: ${fetchOptions.method || 'GET'} ${url}`, { attempt });

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(
            `REST API error: ${response.status} ${response.statusText} - ${errorText}`,
          );

          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw error;
          }

          lastError = error;

          if (attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000;
            this.logger.warn(`Retrying in ${delay}ms...`, { attempt, status: response.status });
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw error;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return {} as T;
        }

        const text = await response.text();
        if (!text) {
          return {} as T;
        }

        return JSON.parse(text) as T;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(`Retrying in ${delay}ms after error...`, {
            attempt,
            error: lastError.message,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  async submitDSR(submission: DSRSubmission): Promise<DSRResponse> {
    const coreIdentifier = submission.coreIdentifier || submission.email;
    const payload = {
      type: submission.type,
      subject: {
        email: submission.email,
        coreIdentifier,
        ...(submission.name && { name: submission.name }),
        ...(submission.phone && { phone: submission.phone }),
      },
      ...(submission.subjectType && { subjectType: submission.subjectType }),
      ...(submission.locale && { locale: submission.locale }),
      ...(submission.isSilent !== undefined && { isSilent: submission.isSilent }),
      ...(submission.skipSecondaryLookup !== undefined && {
        skipSecondaryLookup: submission.skipSecondaryLookup,
      }),
      ...(submission.additionalIdentifiers && {
        additionalIdentifiers: submission.additionalIdentifiers,
      }),
    };
    return this.makeRequest<DSRResponse>('/v1/data-subject-request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDSRStatus(requestId: string): Promise<DSRResponse> {
    return this.makeRequest<DSRResponse>(`/v1/data-subject-request/${requestId}`);
  }

  async getDSRDownloadKeys(requestId: string): Promise<DownloadKey[]> {
    const response = await this.makeRequest<{ downloadKeys: DownloadKey[] }>(
      `/v1/data-subject-request/${requestId}/download-keys`,
    );
    return response.downloadKeys || [];
  }

  async downloadDSRFiles(downloadKey: string): Promise<ArrayBuffer> {
    const effectiveAuth = getRequestAuth() ?? this.auth;
    if (!effectiveAuth) {
      throw new Error('No authentication configured. Provide an API key or session cookie.');
    }
    const baseUrl = await this.prepareRequest();
    const url = `${baseUrl}/v1/files?key=${encodeURIComponent(downloadKey)}`;
    const toolCallId = getToolCallIdHeader();
    const mcpCaller = getRequestMcpCaller();
    const response = await fetch(url, {
      headers: {
        ...authHeaders(effectiveAuth),
        ...this.sombraAuthHeaders(),
        Accept: 'application/octet-stream',
        'User-Agent': TRANSCEND_MCP_USER_AGENT,
        ...(toolCallId && { [TOOLCALL_ID_HEADER]: toolCallId }),
        ...(mcpCaller && { [MCP_CALLER_HEADER]: mcpCaller }),
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  async listRequestIdentifiers(requestId: string): Promise<Record<string, string>[]> {
    const response = await this.makeRequest<{ identifiers: Record<string, string>[] }>(
      '/v1/request-identifiers',
      {
        method: 'POST',
        body: JSON.stringify({ requestId }),
      },
    );
    return response.identifiers || [];
  }

  async enrichIdentifiers(input: EnrichIdentifiersInput): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>('/v1/enrich-identifiers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async respondToAccess(input: AccessResponseInput): Promise<{ success: boolean }> {
    const payload = {
      requestId: input.requestId,
      dataSiloId: input.dataSiloId,
      ...(input.profiles && { profiles: input.profiles }),
      ...(input.files && { files: input.files }),
    };
    return this.makeRequest<{ success: boolean }>('/v1/datapoint', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async respondToAccessChunked(
    input: AccessResponseInput & { chunkIndex: number; totalChunks: number },
  ): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>('/v1/datapoint-chunked', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async confirmErasure(input: ErasureResponseInput): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>('/v1/data-silo', {
      method: 'POST',
      body: JSON.stringify({
        requestId: input.requestId,
        dataSiloId: input.dataSiloId,
        status: 'COMPLETED',
        ...(input.profileIds && { profileIds: input.profileIds }),
      }),
    });
  }

  async getPendingRequests(
    dataSiloId: string,
    requestType: 'ACCESS' | 'ERASURE',
  ): Promise<{ requests: { id: string; identifiers: Record<string, string> }[] }> {
    return this.makeRequest<{ requests: { id: string; identifiers: Record<string, string> }[] }>(
      `/v1/data-silo/${dataSiloId}/pending-requests/${requestType}`,
    );
  }

  async queryPreferences(input: PreferenceQueryInput): Promise<UserPreferences[]> {
    const response = await this.makeRequest<{ preferences: UserPreferences[] }>(
      `/v1/preferences/${encodeURIComponent(input.partition)}/query`,
      { method: 'POST', body: JSON.stringify({ identifiers: input.identifiers }) },
    );
    return response.preferences || [];
  }

  async upsertPreferences(
    input: PreferenceUpsertInput,
  ): Promise<{ success: boolean; count: number }> {
    return this.makeRequest<{ success: boolean; count: number }>('/v1/preferences', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deletePreferences(
    partition: string,
    identifiers: { value: string; type?: string }[],
  ): Promise<{ success: boolean; count: number }> {
    return this.makeRequest<{ success: boolean; count: number }>(
      `/v1/preferences/${encodeURIComponent(partition)}/delete`,
      { method: 'DELETE', body: JSON.stringify({ identifiers }) },
    );
  }

  async appendIdentifiers(
    partition: string,
    userId: string,
    identifiers: { value: string; type?: string }[],
  ): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(
      `/v1/preferences/${encodeURIComponent(partition)}/append-identifiers`,
      { method: 'POST', body: JSON.stringify({ userId, identifiers }) },
    );
  }

  async updateIdentifiers(
    partition: string,
    userId: string,
    identifiers: { oldValue: string; newValue: string; type?: string }[],
  ): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(
      `/v1/preferences/${encodeURIComponent(partition)}/update-identifiers`,
      { method: 'PUT', body: JSON.stringify({ userId, identifiers }) },
    );
  }

  async deleteIdentifiers(
    partition: string,
    userId: string,
    identifiers: { value: string; type?: string }[],
  ): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(
      `/v1/preferences/${encodeURIComponent(partition)}/delete-identifiers`,
      { method: 'DELETE', body: JSON.stringify({ userId, identifiers }) },
    );
  }

  async getConsentPreferences(
    identifier: string,
    partition?: string,
  ): Promise<UserPreferences | null> {
    const params = new URLSearchParams({ identifier });
    if (partition) params.set('partition', partition);
    try {
      return await this.makeRequest<UserPreferences>(`/v1/consent-preferences?${params}`);
    } catch {
      return null;
    }
  }

  async syncConsent(preferences: UserPreferences): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>('/sync', {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  }

  async classifyText(input: LLMClassificationInput): Promise<LLMClassificationResult[]> {
    const payload = { inputList: input.texts, labels: input.categories || [] };
    const response = await this.makeRequest<{ results: LLMClassificationResult[] }>(
      '/llm/classify-text',
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return response.results || [];
  }

  async extractEntities(input: NERExtractionInput): Promise<NERExtractionResult> {
    const payload = { inputList: [input.text], labels: input.entityTypes || [] };
    return this.makeRequest<NERExtractionResult>('/classify/unstructured-text', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getSombraPublicKey(): Promise<{ key: string }> {
    return this.makeRequest<{ key: string }>('/public-keys/sombra-general-signing-key');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getSombraPublicKey();
      return true;
    } catch (error) {
      this.logger.error('REST connection test failed', error);
      return false;
    }
  }

  /**
   * Returns the resolved Sombra base URL, or an empty string if not yet resolved.
   */
  getBaseUrl(): string {
    return this.baseUrl ?? '';
  }
}
