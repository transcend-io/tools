# @transcend-io/react-airgap

React helpers for loading scripts after Transcend Airgap is ready.

## TrackingScript

`TrackingScript` is a small client component around `next/script`. It renders
nothing until its `loadAfter` promise resolves, then renders the underlying
`<Script>`.

```tsx
import { airgapReady } from '@transcend-io/react-airgap';
import { TrackingScript } from '@transcend-io/react-airgap/next';

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

### Custom Gates

The resolved value is ignored, so any `PromiseLike<unknown>` can open the gate.
Create the promise outside render so React does not restart the gate effect on
every render. The promise names below, such as `analyticsConsentPromise`, are
app-provided examples.

Use `Promise.all(...)` when every condition must finish:

```tsx
const loadAfter = Promise.all([airgapReady(), analyticsConsentPromise]);

<TrackingScript
  src="https://cdn.example.com/analytics.js"
  strategy="afterInteractive"
  loadAfter={loadAfter}
/>;
```

Use `Promise.race(...)` when any condition can open the gate:

```tsx
const loadAfter = Promise.race([routeSettledPromise, timeoutPromise]);

<TrackingScript
  src="https://cdn.example.com/analytics.js"
  strategy="lazyOnload"
  loadAfter={loadAfter}
/>;
```

To wait for the next Airgap `sync` event:

```tsx
const airgapSyncPromise = airgapReady().then((airgap) => {
  return new Promise<void>((resolve) => {
    airgap.addEventListener('sync', () => resolve(), { once: true });
  });
});

<TrackingScript
  src="https://cdn.example.com/analytics.js"
  strategy="afterInteractive"
  loadAfter={airgapSyncPromise}
/>;
```

You can also gate inline scripts. Like `next/script`, inline scripts should
include an `id`:

```tsx
const gtmReadyPromise = airgapReady();

<TrackingScript id="gtm-init" strategy="afterInteractive" loadAfter={gtmReadyPromise}>{`
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;
  j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXX');
`}</TrackingScript>;
```

## airgapReady

`airgapReady()` resolves with the typed `AirgapAPI` when
`self.airgap.ready(...)` fires. If airgap.js has not loaded yet, it creates the
documented ready-queue stub so the callback is drained when airgap.js
initializes.

```tsx
import { airgapReady } from '@transcend-io/react-airgap';
import { TrackingScript } from '@transcend-io/react-airgap/next';

const loadAfter = Promise.all([airgapReady(), analyticsConsentPromise]);

export function AnalyticsScript() {
  return <TrackingScript src="https://cdn.example.com/analytics.js" loadAfter={loadAfter} />;
}
```

When loading airgap.js asynchronously, make sure no trackers load before
airgap.js is ready. Async loading cannot regulate trackers that initialize
before Airgap has initialized. See Transcend's guide to
[loading airgap.js asynchronously](https://docs.transcend.io/docs/articles/consent-management/configuration/loading-asynchronously.md).

## ConsentProvider

`ConsentProvider` loads airgap.js through `next/script` and exposes the loaded
`airgap` and `transcend` APIs through `useConsentManager()`.

```tsx
import { ConsentProvider, useConsentManager } from '@transcend-io/react-airgap/next';

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

`ConsentBoundary` checks the URLs needed by a subtree before mounting its
children. While the check is pending, or when consent is missing, only the
fallback renders so gated children cannot start loading network resources.

```tsx
import {
  ConsentBoundary,
  type ConsentBoundaryFallbackProps,
} from '@transcend-io/react-airgap/next';

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
