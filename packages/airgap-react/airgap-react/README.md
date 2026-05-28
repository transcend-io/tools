# @transcend-io/airgap-react

React helpers for loading airgap.js asynchronously and gating trackers.

Using Next.js? Use
[`@transcend-io/airgap-nextjs`](https://www.npmjs.com/package/@transcend-io/airgap-nextjs)
instead. It provides the same public APIs, but renders scripts with
`next/script`.

## API Overview

1. `useConsentManager()` hook: access the loaded Airgap APIs and re-render when
   airgap.js is ready.

   ```tsx
   const { airgap, transcend } = useConsentManager();
   ```

2. `<TrackingScript>` component: a `<script>` tag that waits for airgap.js or
   any other promise before loading.

   ```tsx
   <TrackingScript src="https://cdn.example.com/analytics.js" loadAfter={loadAfter} />
   ```

3. `<ConsentBoundary>` component: like a
   [`<Suspense>`](https://react.dev/reference/react/Suspense) boundary, but it
   waits until consent is granted before mounting children. See the
   [ConsentBoundary demo](https://docs.transcend.io/docs/articles/consent-management/reference/react-snippets#add-a-consentboundary-react-component).

   ```tsx
   <ConsentBoundary urlsRequiredForRender={[videoUrl]} fallback={ConsentFallback}>
     <VideoPlayer src={videoUrl} />
   </ConsentBoundary>
   ```

> [!WARNING]
> If you load airgap.js asynchronously, Airgap can only regulate network traffic
> after it has loaded. Make sure no trackers load before airgap.js is ready. See
> Transcend's guide to
> [loading airgap.js asynchronously](https://docs.transcend.io/docs/articles/consent-management/configuration/loading-asynchronously).

## useConsentManager

`useConsentManager()` returns the loaded `airgap` and `transcend` APIs. The hook
re-renders when either API becomes ready.

If your app already loads airgap.js, call the hook directly and it will observe
the existing `self.airgap` and `self.transcend` globals:

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

Use `ConsentProvider` when you want this package to inject airgap.js for you **asynchronously**:

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

## TrackingScript

`TrackingScript` injects a script element after its `loadAfter` promise
resolves. The resolved value is ignored, so any `PromiseLike<unknown>` can open
the gate.

Create the promise outside render so React does not restart the gate effect on
every render.

```tsx
import { airgapReady, TrackingScript } from '@transcend-io/airgap-react';

const loadAfter = airgapReady();

export function AnalyticsScript() {
  return <TrackingScript src="https://cdn.example.com/analytics.js" loadAfter={loadAfter} />;
}
```

You can also compose multiple gates or gate inline scripts:

```tsx
const loadAfter = Promise.all([airgapReady(), analyticsConsentPromise]);

<TrackingScript src="https://cdn.example.com/analytics.js" loadAfter={loadAfter} />;

<TrackingScript id="gtm-init" loadAfter={airgapReady()}>{`
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'gtm.js' });
`}</TrackingScript>;
```

## ConsentBoundary

`ConsentBoundary` is similar to
[`<Suspense>`](https://react.dev/reference/react/Suspense): it displays a
fallback while work is pending, then reveals its children when they are ready.
Instead of waiting for code or data, it waits until Airgap allows the URLs needed
by the subtree.

This is a good fit for embeds, videos, analytics widgets, and other components
that connect to services requiring consent.

<video controls src="https://cdn.sanity.io/files/1ievmmav/production/40de95dcbe5e1c0406493c96b708590f505d5db8.webm"></video>

While the check is pending, or when consent is missing, only the fallback renders
so gated children cannot start loading network resources. It uses
`useConsentManager()`, so it works with `ConsentProvider` or with Airgap globals
loaded separately. The fallback receives the missing consent purposes and an
`onConsentGiven` handler that opts into those purposes.

```tsx
import { ConsentBoundary } from '@transcend-io/airgap-react';

export function VideoBoundary({ videoUrl }: { videoUrl: string }) {
  return (
    <ConsentBoundary
      urlsRequiredForRender={[videoUrl]}
      fallback={({ missingConsentPurposes, onConsentGiven, status }) => {
        if (status === 'pending') {
          return <p>Checking consent...</p>;
        }

        return (
          <button type="button" onClick={onConsentGiven}>
            Allow {Array.from(missingConsentPurposes).join(', ')} trackers
          </button>
        );
      }}
    >
      <VideoPlayer src={videoUrl} />
    </ConsentBoundary>
  );
}
```

## Helpers

### airgapReady

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
