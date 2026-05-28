# @transcend-io/airgap-nextjs

Next.js helpers for loading Airgap and gating trackers. This package has the
same public features as `@transcend-io/airgap-react`, but uses `next/script`
for script rendering.

Not using Next.js? Use
[`@transcend-io/airgap-react`](https://www.npmjs.com/package/@transcend-io/airgap-react)
instead. It provides the same public APIs without depending on `next/script`.

> [!WARNING]
> If you load airgap.js asynchronously, Airgap can only regulate network traffic
> after it has loaded. Make sure no trackers load before airgap.js is ready. See
> Transcend's guide to
> [loading airgap.js asynchronously](https://docs.transcend.io/docs/articles/consent-management/configuration/loading-asynchronously).

## API Overview

1. `useConsentManager()` hook: access the loaded Airgap APIs and re-render when
   airgap.js is ready.

   ```tsx
   const { airgap, transcend } = useConsentManager();
   ```

2. `<TrackingScript>` component: a `next/script` wrapper that waits for airgap.js
   or any other promise before loading.

   ```tsx
   <TrackingScript
     src="https://cdn.example.com/analytics.js"
     strategy="afterInteractive"
     loadAfter={loadAfter}
   />
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

## useConsentManager

`useConsentManager()` returns the loaded `airgap` and `transcend` APIs. The hook
re-renders when either API becomes ready.

If your app already loads airgap.js, call the hook directly and it will observe
the existing `self.airgap` and `self.transcend` globals:

```tsx
import { useConsentManager } from '@transcend-io/airgap-nextjs';

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

Use `ConsentProvider` when you want this package to load airgap.js through
`next/script`:

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

## TrackingScript

`TrackingScript` is a small client component around `next/script`. It renders
nothing until its `loadAfter` promise resolves, then renders the underlying
`<Script>`.

Create the promise outside render so React does not restart the gate effect on
every render.

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

## ConsentBoundary

`ConsentBoundary` is re-exported from `@transcend-io/airgap-react` so it shares
the same behavior in both packages. It is similar to
[`<Suspense>`](https://react.dev/reference/react/Suspense): it displays a
fallback while work is pending, then reveals its children when they are ready.
Instead of waiting for code or data, it waits until Airgap allows the URLs needed
by the subtree.

This is a good fit for embeds, videos, analytics widgets, and other components
that connect to services requiring consent.

<video controls src="https://cdn.sanity.io/files/1ievmmav/production/40de95dcbe5e1c0406493c96b708590f505d5db8.webm"></video>

It uses `useConsentManager()`, so it works with `ConsentProvider` or with Airgap
globals loaded separately. The fallback receives the missing consent purposes
and an `onConsentGiven` handler that opts into those purposes.

```tsx
import { ConsentBoundary } from '@transcend-io/airgap-nextjs';

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
import { airgapReady } from '@transcend-io/airgap-nextjs';

const airgapSyncPromise = airgapReady().then((airgap) => {
  return new Promise<void>((resolve) => {
    airgap.addEventListener('sync', () => resolve(), { once: true });
  });
});
```
