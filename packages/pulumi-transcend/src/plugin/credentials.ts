/** Production Transcend API host in the EU, the CLI default. */
export const DEFAULT_TRANSCEND_API_URL = 'https://api.transcend.io';

/** Values the Pulumi engine passes to the provider in its `Configure` call. */
export interface ProviderSettings {
  /** Transcend API key, from `transcend:apiKey` */
  apiKey?: string;
  /** Transcend API base URL, from `transcend:url` */
  url?: string;
}

/** Credentials needed to call the Transcend API. */
export interface TranscendCredentials {
  /** Transcend API key */
  apiKey: string;
  /** Transcend API base URL without a trailing slash */
  url: string;
}

/**
 * Holds provider settings captured from the engine and resolves credentials.
 * Environment variables back-fill only after `Configure` arrives, so a missed
 * gRPC hook does not silently fall back to `TRANSCEND_API_KEY`.
 */
export class CredentialStore {
  private settings: ProviderSettings = {};
  private configureReceived = false;
  private credentialsLocked = false;

  constructor(
    /** Environment to read fallbacks from */
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  /** Record the settings the engine sent in `Configure`. */
  setSettings(settings: ProviderSettings): void {
    if (this.credentialsLocked) {
      const apiKeyChanged =
        settings.apiKey !== undefined && settings.apiKey !== this.settings.apiKey;
      const urlChanged = settings.url !== undefined && settings.url !== this.settings.url;
      if (apiKeyChanged || urlChanged) {
        throw new Error('Provider Configure cannot change credentials after the first call.');
      }
      return;
    }
    this.settings = { ...settings };
    this.configureReceived = true;
    this.credentialsLocked = true;
  }

  /** Resolve credentials, throwing when no API key is available. */
  resolve(): TranscendCredentials {
    if (!this.configureReceived) {
      throw new Error(
        'Provider Configure was not received. Set `transcend:apiKey` in stack config before resources run.',
      );
    }
    const apiKeyFromStack = this.settings.apiKey;
    const apiKey = apiKeyFromStack || this.env.TRANSCEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        'No Transcend API key. Set the `transcend:apiKey` stack config (as a secret) or the TRANSCEND_API_KEY environment variable.',
      );
    }
    const url = apiKeyFromStack
      ? this.settings.url || DEFAULT_TRANSCEND_API_URL
      : this.settings.url || this.env.TRANSCEND_API_URL || DEFAULT_TRANSCEND_API_URL;
    const normalized = url.replace(/\/+$/, '');
    if (!normalized.startsWith('https://')) {
      throw new Error('Transcend API URL must use https.');
    }
    return { apiKey, url: normalized };
  }
}
