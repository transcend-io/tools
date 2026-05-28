# @transcend-io/airgap-nextjs

Next.js helpers for loading Airgap and gating trackers. This package has the
same public features as `@transcend-io/airgap-react`, but uses `next/script`
for script rendering.

## TrackingScript

`TrackingScript` is a small client component around `next/script`. It renders
nothing until its `loadAfter` promise resolves, then renders the underlying
`<Script>`.

```tsx
import { airgapReady, TrackingScript } from '@transcend-io/airgap-nextjs';

const loadAfter = airgapReady();

export function AnalyticsScript() {
  return (
    <TrackingScript
      src="https://cdn.example.com/analytics.js"
      strategy="afterInteractive"
      loadAfter={loadAfter}
    />
  );
}
```

`strategy="beforeInteractive"` is unsupported because `TrackingScript` gates
script injection after hydration.

## airgapReady

`airgapReady()` resolves with the typed `AirgapAPI` when
`self.airgap.ready(...)` fires. If airgap.js has not loaded yet, it creates the
documented ready-queue stub so the callback is drained when airgap.js
initializes.

```tsx
const airgapSyncPromise = airgapReady().then((airgap) => {
  return new Promise<void>((resolve) => {
    airgap.addEventListener('sync', () => resolve(), { once: true });
  });
});
```

When loading airgap.js asynchronously, make sure no trackers load before
airgap.js is ready. Async loading cannot regulate trackers that initialize
before Airgap has initialized. See Transcend's guide to
[loading airgap.js asynchronously](https://docs.transcend.io/docs/articles/consent-management/configuration/loading-asynchronously.md).

## useConsentManager

`useConsentManager()` returns the loaded `airgap` and `transcend` APIs. Wrap
your app in `ConsentProvider` once so it can load airgap.js through
`next/script` and populate the hook.

```tsx
import { ConsentProvider, useConsentManager } from '@transcend-io/airgap-nextjs';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConsentProvider
      airgapSrc="https://transcend-cdn.com/cm/<bundle-id>/airgap.js"
      scriptProps={{ strategy: 'afterInteractive' }}
    >
      {children}
    </ConsentProvider>
  );
}

export function PrivacyChoicesButton() {
  const { transcend } = useConsentManager();

  return (
    <button
      type="button"
      disabled={!transcend}
      onClick={() => void transcend?.showConsentManager()}
    >
      Privacy choices
    </button>
  );
}
```

## ConsentBoundary

`ConsentBoundary` is re-exported from `@transcend-io/airgap-react` so it shares
the same behavior in both packages.

```tsx
import { ConsentBoundary, type ConsentBoundaryFallbackProps } from '@transcend-io/airgap-nextjs';

function ConsentFallback({
  missingConsentPurposes,
  onConsentGiven,
  status,
}: ConsentBoundaryFallbackProps) {
  if (status === 'pending') {
    return <p>Checking consent...</p>;
  }

  return (
    <button type="button" onClick={onConsentGiven}>
      Allow {Array.from(missingConsentPurposes).join(', ')} trackers
    </button>
  );
}
```
