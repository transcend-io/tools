import { useMcpApp } from '@transcend-io/mcp-server-base/ui';

import type { CookieTriageAppPayload } from '../../lib/cookieTriageTypes.ts';
import { CookieTriageProvider } from './CookieTriageContext.tsx';
import { CookieTriageLoaded } from './CookieTriageLoaded.tsx';

const CARD = 'mx-auto w-full max-w-view rounded-lg bg-surface-raised px-6 py-5 shadow-sm';
const TITLE = 'mb-1 text-heading-md font-semibold text-content';
const SUBTITLE = 'text-sm text-content-muted';

/** Handles MCP connection, loading, and error states before rendering the triage view. */
export function CookieTriageView() {
  const { app, data, isConnected, connectionError, toolError } = useMcpApp<CookieTriageAppPayload>({
    appInfo: { name: 'transcend-consent-cookie-triage', version: '1.0.0' },
    capabilities: {
      // Hosts only offer fullscreen when the view declares it during ui/initialize.
      availableDisplayModes: ['inline', 'fullscreen'],
    },
  });

  if (connectionError) {
    return (
      <section className={`${CARD} border-l-4 border-l-danger`} role="alert">
        <h1 className={TITLE}>Could not reach the host</h1>
        <p className={SUBTITLE}>{connectionError.message}</p>
      </section>
    );
  }

  if (toolError !== undefined && data === undefined) {
    return (
      <section className={CARD}>
        <h1 className={TITLE}>Cookie triage</h1>
        <p className="text-sm text-danger" role="alert">
          {toolError}
        </p>
      </section>
    );
  }

  if (!isConnected || data === undefined) {
    return (
      <section className={CARD} aria-busy="true">
        <h1 className={TITLE}>{!isConnected ? 'Connecting…' : 'Loading cookies…'}</h1>
        <p className={SUBTITLE}>
          {!isConnected ? 'Waiting for the host handshake.' : 'Waiting for triage data.'}
        </p>
      </section>
    );
  }

  return (
    <CookieTriageProvider payload={data}>
      <CookieTriageLoaded app={app} toolError={toolError} />
    </CookieTriageProvider>
  );
}
