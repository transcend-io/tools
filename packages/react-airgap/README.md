# @transcend-io/react-airgap

React helpers for loading scripts after Transcend Airgap is ready.

## TrackingScript

`TrackingScript` is a small client component around `next/script`. It renders
nothing until its `loadAfter` promise resolves, then renders the underlying
`<Script>`.

```tsx
import { airgapReady, TrackingScript } from '@transcend-io/react-airgap';

export function AnalyticsScript() {
  return (
    <TrackingScript
      src="https://cdn.example.com/analytics.js"
      strategy="afterInteractive"
      loadAfter={airgapReady()}
    />
  );
}
```

`strategy="beforeInteractive"` is unsupported because `TrackingScript` gates
script injection after hydration.

## Custom Gates

The resolved value is ignored, so any `PromiseLike<unknown>` can open the gate.

Use `Promise.all(...)` when every condition must finish:

```tsx
<TrackingScript
  src="https://cdn.example.com/analytics.js"
  strategy="afterInteractive"
  loadAfter={Promise.all([airgapReady(), analyticsConsentPromise])}
/>
```

Use `Promise.race(...)` when any condition can open the gate:

```tsx
<TrackingScript
  src="https://cdn.example.com/analytics.js"
  strategy="lazyOnload"
  loadAfter={Promise.race([routeSettledPromise, timeoutPromise])}
/>
```

To wait for Airgap's `sync` event:

```tsx
const airgapSyncPromise = new Promise<void>((resolve) => {
  self.airgap.ready((airgap) => {
    airgap.addEventListener('sync', () => resolve(), { once: true });
  });
});

<TrackingScript
  src="https://cdn.example.com/analytics.js"
  strategy="afterInteractive"
  loadAfter={Promise.all([analyticsConsentPromise, airgapSyncPromise])}
/>;
```

## airgapReady

`airgapReady()` resolves when `self.airgap.ready(...)` fires. If airgap.js has
not loaded yet, it creates the documented ready-queue stub so the callback is
drained when airgap.js initializes.

```tsx
import { airgapReady, TrackingScript } from '@transcend-io/react-airgap';

<TrackingScript
  src="https://cdn.example.com/analytics.js"
  loadAfter={Promise.all([airgapReady(), analyticsConsentPromise])}
/>;
```

When loading airgap.js asynchronously, make sure no trackers load before
airgap.js is ready. See Transcend's guide to
[loading airgap.js asynchronously](https://docs.transcend.io/docs/articles/consent-management/configuration/loading-asynchronously.md).
