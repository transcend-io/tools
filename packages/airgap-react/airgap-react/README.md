# @transcend-io/airgap-react

React helpers for loading Airgap and gating trackers without depending on
Next.js.

## TrackingScript

`TrackingScript` injects a script element after its `loadAfter` promise
resolves.

```tsx
import { airgapReady, TrackingScript } from '@transcend-io/airgap-react';

const loadAfter = airgapReady();

export function AnalyticsScript() {
  return <TrackingScript src="https://cdn.example.com/analytics.js" loadAfter={loadAfter} />;
}
```

The resolved value is ignored, so any `PromiseLike<unknown>` can open the gate.
Create the promise outside render so React does not restart the gate effect on
every render.

```tsx
const loadAfter = Promise.all([airgapReady(), analyticsConsentPromise]);

<TrackingScript src="https://cdn.example.com/analytics.js" loadAfter={loadAfter} />;
```

You can also gate inline scripts:

```tsx
const gtmReadyPromise = airgapReady();

<TrackingScript id="gtm-init" loadAfter={gtmReadyPromise}>{`
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'gtm.js' });
`}</TrackingScript>;
```

## airgapReady

`airgapReady()` resolves with the typed `AirgapAPI` when
`self.airgap.ready(...)` fires. If airgap.js has not loaded yet, it creates the
documented ready-queue stub so the callback is drained when airgap.js
initializes.

```tsx
import { airgapReady } from '@transcend-io/airgap-react';

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

`useConsentManager()` returns the loaded `airgap` and `transcend` APIs. If your
app already loads airgap.js, the hook observes the existing `self.airgap` and
`self.transcend` globals without a provider.

Use `ConsentProvider` when you want this package to inject airgap.js for you:

```tsx
import { ConsentProvider, useConsentManager } from '@transcend-io/airgap-react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConsentProvider airgapSrc="https://transcend-cdn.com/cm/<bundle-id>/airgap.js">
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

If Airgap is loaded elsewhere, call the hook directly:

```tsx
import { useConsentManager } from '@transcend-io/airgap-react';

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

`ConsentBoundary` checks the URLs needed by a subtree before mounting its
children. While the check is pending, or when consent is missing, only the
fallback renders so gated children cannot start loading network resources. It
uses `useConsentManager()`, so it works with `ConsentProvider` or with Airgap
globals loaded separately.

```tsx
import { ConsentBoundary, type ConsentBoundaryFallbackProps } from '@transcend-io/airgap-react';

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

export function AnalyticsWidgetBoundary() {
  return (
    <ConsentBoundary
      urlsRequiredForRender={['https://www.googletagmanager.com/gtm.js?id=GTM-XXXX']}
      fallback={ConsentFallback}
    >
      <AnalyticsWidget />
    </ConsentBoundary>
  );
}
```
