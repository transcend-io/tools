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
 * Environment variables back-fill what the stack configuration leaves unset, so
 * `TRANSCEND_API_KEY` works the same way it does for the Transcend CLI.
 */
export class CredentialStore {
  private settings: ProviderSettings = {};

  constructor(
    /** Environment to read fallbacks from */
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  /** Record the settings the engine sent in `Configure`. */
  setSettings(settings: ProviderSettings): void {
    this.settings = settings;
  }

  /** Resolve credentials, throwing when no API key is available. */
  resolve(): TranscendCredentials {
    const apiKey = this.settings.apiKey || this.env.TRANSCEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        'No Transcend API key. Set the `transcend:apiKey` stack config (as a secret) or the TRANSCEND_API_KEY environment variable.',
      );
    }
    const url = this.settings.url || this.env.TRANSCEND_API_URL || DEFAULT_TRANSCEND_API_URL;
    return { apiKey, url: url.replace(/\/+$/, '') };
  }
}
