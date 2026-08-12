/**
 * Example GENERAL custom function: sync a preference change from an external
 * system (e.g. Snowflake) into the Transcend Preference Store.
 *
 * Custom functions run on your Sombra gateway in a sandboxed runtime. The
 * `sdk.fetch` client is pre-authorized against your Transcend instance, and
 * environment variables come from the manifest's `env` block (templated via
 * the `variables` input so secrets never live in the repository).
 *
 * Adapted from the Rules Automation use cases:
 * https://docs.transcend.io/docs/articles/rules-automation/webhook-user-guide#usecases
 */

/** A single topic preference carried on the payload */
interface TopicPreference {
  /** Preference topic (e.g. ContactMethod) */
  topic: string;
  /** Chosen value(s) */
  value: string | boolean | string[];
}

/** The webhook payload sent by the external system */
interface PreferenceUpdatePayload {
  /** The user identifier (e.g. email) */
  identifier: string;
  /** System the change originated from */
  source?: string;
  /** Purpose being updated (e.g. Marketing) */
  purpose: string;
  /** Whether the purpose is opted in */
  enabled: boolean;
  /** Topic-level preferences */
  preferences?: TopicPreference[];
}

/**
 * Map a topic value onto the Preference Store choice shape.
 *
 * @param value - The raw topic value
 * @returns The choice object for the preferences API
 */
function toChoice(value: TopicPreference['value']): object {
  if (Array.isArray(value)) {
    return { selectValues: value.map(String) };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  return { selectValue: String(value) };
}

export default async function updatePreferences({
  environment,
  payload,
  sdk,
}: {
  environment: { [key: string]: string };
  payload: PreferenceUpdatePayload;
  sdk: { fetch: typeof fetch };
}): Promise<void> {
  const apiKey = environment['TRANSCEND_API_KEY'];
  const partition = environment['TRANSCEND_PARTITION'];
  if (!apiKey) {
    throw new Error('Missing TRANSCEND_API_KEY environment variable');
  }
  if (!partition) {
    throw new Error('Missing TRANSCEND_PARTITION environment variable');
  }

  const { identifier } = payload;
  if (!identifier) {
    throw new Error('Could not resolve a user identifier from the payload');
  }

  const response = await sdk.fetch('/v1/preferences', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      records: [
        {
          userId: identifier,
          partition,
          timestamp: new Date().toISOString(),
          identifiers: [{ name: 'email', value: identifier }],
          purposes: [
            {
              purpose: payload.purpose,
              enabled: payload.enabled,
              ...(payload.preferences && payload.preferences.length > 0
                ? {
                    preferences: payload.preferences.map(({ topic, value }) => ({
                      topic,
                      choice: toChoice(value),
                    })),
                  }
                : {}),
            },
          ],
          metadata: [{ key: 'source', value: String(payload.source ?? 'external-system') }],
        },
      ],
      skipWorkflowTriggers: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to upsert preferences: ${response.status} ${response.statusText} - ${body}`,
    );
  }
}
