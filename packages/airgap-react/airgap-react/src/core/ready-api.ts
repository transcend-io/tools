export type ReadyApi<TApi> = {
  /** Queue of callbacks to dispatch once the API is ready. */
  readyQueue?: Array<(api: TApi) => void>;
  /** Subscribe to the API ready event. */
  ready(callback: (api: TApi) => void): void;
};

export interface ReadyApiObserverOptions<TApi extends EventTarget> {
  /** Current global API or pre-init stub. */
  api: TApi | Partial<ReadyApi<TApi>> | undefined;
  /** Called when a pre-init stub should be assigned back to the global. */
  setApi(api: ReadyApi<TApi>): void;
  /** Called when the API is initialized. */
  onReady(api: TApi): void;
}

export function isInitializedReadyApi<TApi extends EventTarget>(
  api: TApi | Partial<ReadyApi<TApi>> | undefined,
): api is TApi {
  return (
    typeof (api as { addEventListener?: unknown } | undefined)?.addEventListener === 'function'
  );
}

function ensureReadyApi<TApi>(existing: Partial<ReadyApi<TApi>> | undefined): ReadyApi<TApi> {
  if (existing?.ready) {
    return existing as ReadyApi<TApi>;
  }

  const readyQueue = existing?.readyQueue ?? [];

  return {
    ...existing,
    readyQueue,
    ready(callback) {
      readyQueue.push(callback);
    },
  };
}

/**
 * Observe an Airgap-style global ready API, creating the documented pre-init
 * ready queue stub if the API has not loaded yet.
 */
export function observeReadyApi<TApi extends EventTarget>({
  api,
  onReady,
  setApi,
}: ReadyApiObserverOptions<TApi>): () => void {
  let cancelled = false;

  if (isInitializedReadyApi<TApi>(api)) {
    onReady(api);
    return () => {
      cancelled = true;
    };
  }

  const readyApi = ensureReadyApi<TApi>(api);
  setApi(readyApi);
  readyApi.ready((readyApiValue) => {
    if (!cancelled) onReady(readyApiValue);
  });

  return () => {
    cancelled = true;
  };
}
