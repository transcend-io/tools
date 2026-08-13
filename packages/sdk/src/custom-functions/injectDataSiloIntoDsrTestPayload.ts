/**
 * Inject the resolved data silo into a DSR test payload.
 *
 * The backend's unsaved-DSR test path resolves the execution Sombra from
 * `extras.dataSilo.id`, so the payload must reference the function's actual
 * data silo — which the payload file cannot know for silos created during
 * the same push. The silo `id` is always overridden; other `extras.dataSilo`
 * fields from the payload file are preserved, with `title` defaulted when
 * missing.
 *
 * @param payload - The DSR test payload from the manifest
 * @param dataSilo - The resolved data silo
 * @returns The payload with `extras.dataSilo` pointing at the resolved silo
 */
export function injectDataSiloIntoDsrTestPayload(
  payload: object,
  dataSilo: {
    /** Data silo ID */
    id: string;
    /** Fallback title when the payload does not carry one */
    title: string;
  },
): object {
  const record = payload as {
    /** DSR payload extras */
    extras?: Record<string, unknown>;
  };
  const extras = record.extras ?? {};
  const existingDataSilo = (extras['dataSilo'] ?? {}) as Record<string, unknown>;
  return {
    ...record,
    extras: {
      ...extras,
      dataSilo: {
        title: dataSilo.title,
        ...existingDataSilo,
        id: dataSilo.id,
      },
    },
  };
}
