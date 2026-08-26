import { getRequestAuth } from '../auth-context.js';
import { type AuthCredentials, authHeaders } from '../auth.js';
import {
  MCP_CALLER_HEADER,
  MCP_CLIENT_NAME_HEADER,
  MCP_VERSION_HEADER,
  SOMBRA_AUTHORIZATION_HEADER,
  TOOLCALL_ID_HEADER,
  TRANSCEND_VERSION_HEADER,
  TRANSCEND_VERSION_HEADER_VALUE,
} from '../http-header-names.js';
import {
  resolveMcpCallerAttribution,
  resolveMcpClientName,
  resolveMcpPackageVersion,
} from '../mcp-caller-context.js';
import { getToolCallIdHeader } from '../tool-call-context.js';
import type {
  DSRSubmission,
  DSRResponse,
  DSRCreatedSummary,
  DownloadKey,
  EnrichIdentifiersInput,
  AccessResponseInput,
  ErasureResponseInput,
  PreferenceQueryInput,
  PreferenceQueryResult,
  PreferenceUpsertInput,
  PreferenceDeleteRecordInput,
  PreferenceAppendIdentifierRecordInput,
  PreferenceUpdateIdentifierRecordInput,
  PreferenceDeleteIdentifierRecordInput,
  PreferenceIdentifiersResponse,
  PendingRequestItem,
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
    const mcpCaller = resolveMcpCallerAttribution();
    const mcpClientName = resolveMcpClientName();
    const mcpPackageVersion = resolveMcpPackageVersion();
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
      ...(mcpClientName && { [MCP_CLIENT_NAME_HEADER]: mcpClientName }),
      ...(mcpPackageVersion && { [MCP_VERSION_HEADER]: mcpPackageVersion }),
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

  async submitDSR(submission: DSRSubmission): Promise<DSRCreatedSummary[]> {
    const coreIdentifier = submission.coreIdentifier || submission.email;
    const payload = {
      input: [
        {
          workflowConfigId: submission.workflowConfigId,
          attestedAuthContext: {
            email: submission.email,
            coreIdentifier,
          },
          ...(submission.locale && { locale: submission.locale }),
          ...(submission.isSilent !== undefined && { isSilent: submission.isSilent }),
        },
      ],
    };
    const response = await this.makeRequest<{ requests: DSRResponse[] }>(
      '/v1/data-subject-request-bulk',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    const requests = response.requests ?? [];
    if (requests.length === 0) {
      throw new Error('Bulk DSR submission returned no requests');
    }
    return requests.map((request) => ({
      id: request.id,
      status: request.status,
      ...(request.type !== undefined && { type: request.type }),
      ...(request.subjectType !== undefined && { subjectType: request.subjectType }),
      ...(request.link !== undefined && { link: request.link }),
    }));
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
    const mcpCaller = resolveMcpCallerAttribution();
    const mcpClientName = resolveMcpClientName();
    const mcpPackageVersion = resolveMcpPackageVersion();
    const response = await fetch(url, {
      headers: {
        ...authHeaders(effectiveAuth),
        ...this.sombraAuthHeaders(),
        Accept: 'application/octet-stream',
        'User-Agent': TRANSCEND_MCP_USER_AGENT,
        ...(toolCallId && { [TOOLCALL_ID_HEADER]: toolCallId }),
        ...(mcpCaller && { [MCP_CALLER_HEADER]: mcpCaller }),
        ...(mcpClientName && { [MCP_CLIENT_NAME_HEADER]: mcpClientName }),
        ...(mcpPackageVersion && { [MCP_VERSION_HEADER]: mcpPackageVersion }),
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  async listRequestIdentifiers(
    requestId: string,
    options?: {
      /** Maximum number of identifiers to return (default 50) */
      first?: number;
      /** Zero-based offset for pagination */
      offset?: number;
    },
  ): Promise<Record<string, string>[]> {
    const first = Math.min(options?.first ?? 50, 100);
    const offset = options?.offset ?? 0;
    const response = await this.makeRequest<{ identifiers: Record<string, string>[] }>(
      '/v1/request-identifiers',
      {
        method: 'POST',
        body: JSON.stringify({ requestId, first, offset }),
      },
    );
    return response.identifiers || [];
  }

  async enrichIdentifiers(input: EnrichIdentifiersInput): Promise<{ success: boolean }> {
    const enrichedIdentifiers = Object.entries(input.identifiers).reduce<
      Record<string, { value: string }[]>
    >((acc, [key, value]) => {
      acc[key] = [{ value: key === 'email' ? value.toLowerCase() : value }];
      return acc;
    }, {});

    const headers: Record<string, string> = {};
    if (input.nonce) {
      headers['x-transcend-nonce'] = input.nonce;
    } else if (input.requestId && input.enricherId) {
      headers['x-transcend-request-id'] = input.requestId.toLowerCase();
      headers['x-transcend-enricher-id'] = input.enricherId;
    } else {
      throw new Error(
        'Either nonce or both requestId and enricherId are required for identifier enrichment',
      );
    }

    return this.makeRequest<{ success: boolean }>('/v1/enrich-identifiers', {
      method: 'POST',
      headers,
      body: JSON.stringify({ enrichedIdentifiers }),
    });
  }

  async respondToAccess(input: AccessResponseInput): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>('/v1/data-silo', {
      method: 'POST',
      headers: { 'x-transcend-nonce': input.nonce },
      body: JSON.stringify({
        profiles: input.profiles ?? [],
      }),
    });
  }

  async respondToAccessChunked(
    input: AccessResponseInput & { chunkIndex: number; totalChunks: number },
  ): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>('/v1/datapoint-chunked', {
      method: 'POST',
      headers: { 'x-transcend-nonce': input.nonce },
      body: JSON.stringify(input),
    });
  }

  async confirmErasure(input: ErasureResponseInput): Promise<{ success: boolean }> {
    const profiles = (input.profileIds ?? []).map((profileId) => ({ profileId }));
    return this.makeRequest<{ success: boolean }>('/v1/data-silo', {
      method: 'PUT',
      headers: { 'x-transcend-nonce': input.nonce },
      body: JSON.stringify({
        profiles,
        status: 'READY',
      }),
    });
  }

  async getPendingRequests(
    dataSiloId: string,
    requestType: 'ACCESS' | 'ERASURE',
  ): Promise<{ items: PendingRequestItem[] }> {
    return this.makeRequest<{ items: PendingRequestItem[] }>(
      `/v1/data-silo/${dataSiloId}/pending-requests/${requestType}`,
    );
  }

  async queryPreferences(input: PreferenceQueryInput): Promise<PreferenceQueryResult> {
    const identifiers = input.identifiers.map(({ value, name }) => ({
      value,
      ...(name !== undefined && { name }),
    }));
    const limit = Math.max(1, Math.min(50, input.limit ?? identifiers.length));
    const response = await this.makeRequest<{ nodes: unknown[]; cursor?: string }>(
      `/v1/preferences/${encodeURIComponent(input.partition)}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          filter: { identifiers },
          limit,
          ...(input.cursor && { cursor: input.cursor }),
        }),
      },
    );
    return { nodes: response.nodes || [], cursor: response.cursor };
  }

  async upsertPreferences(
    input: PreferenceUpsertInput,
  ): Promise<{ success: boolean; nodes?: unknown[] }> {
    return this.makeRequest<{ success: boolean; nodes?: unknown[] }>('/v1/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        records: input.records,
        ...(input.skipWorkflowTriggers !== undefined && {
          skipWorkflowTriggers: input.skipWorkflowTriggers,
        }),
      }),
    });
  }

  async deletePreferences(
    partition: string,
    records: PreferenceDeleteRecordInput[],
  ): Promise<PreferenceIdentifiersResponse> {
    return this.makeRequest<PreferenceIdentifiersResponse>(
      `/v1/preferences/${encodeURIComponent(partition)}/delete`,
      { method: 'POST', body: JSON.stringify({ records }) },
    );
  }

  async appendIdentifiers(
    partition: string,
    records: PreferenceAppendIdentifierRecordInput[],
  ): Promise<PreferenceIdentifiersResponse> {
    return this.makeRequest<PreferenceIdentifiersResponse>(
      `/v1/preferences/${encodeURIComponent(partition)}/append-identifiers`,
      { method: 'POST', body: JSON.stringify({ records }) },
    );
  }

  async updateIdentifiers(
    partition: string,
    records: PreferenceUpdateIdentifierRecordInput[],
  ): Promise<PreferenceIdentifiersResponse> {
    return this.makeRequest<PreferenceIdentifiersResponse>(
      `/v1/preferences/${encodeURIComponent(partition)}/update-identifiers`,
      { method: 'POST', body: JSON.stringify({ records }) },
    );
  }

  async deleteIdentifiers(
    partition: string,
    records: PreferenceDeleteIdentifierRecordInput[],
  ): Promise<PreferenceIdentifiersResponse> {
    return this.makeRequest<PreferenceIdentifiersResponse>(
      `/v1/preferences/${encodeURIComponent(partition)}/delete-identifiers`,
      { method: 'POST', body: JSON.stringify({ records }) },
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
    const payload: { inputList: string[]; labels: string[]; model_type?: string } = {
      inputList: input.texts,
      labels: input.categories,
    };
    if (input.model) {
      payload.model_type = input.model;
    }
    const response = await this.makeRequest<{
      guesses: {
        name?: string;
        category?: string;
        confidence: number;
      }[][];
    }>('/llm/classify-text', { method: 'POST', body: JSON.stringify(payload) });

    return (response.guesses ?? []).map((guesses, index) => ({
      text: input.texts[index] ?? '',
      classifications: guesses.map((guess) => ({
        category: guess.name || guess.category || '',
        confidence: guess.confidence,
        ...(guess.category && guess.name !== guess.category ? { subcategory: guess.category } : {}),
      })),
    }));
  }

  async extractEntities(input: NERExtractionInput): Promise<NERExtractionResult> {
    const payload = { inputList: [input.text], labels: input.entityTypes };
    const response = await this.makeRequest<{
      guesses: {
        value?: string;
        type?: string;
        confidence?: number;
        snippet?: string;
      }[][];
    }>('/classify/unstructured-text', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const entities = (response.guesses?.[0] ?? []).map((guess) => ({
      text: guess.value ?? '',
      type: guess.type ?? '',
      confidence: guess.confidence ?? 0,
      ...(guess.snippet !== undefined && { snippet: guess.snippet }),
    }));
    return { entities };
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
