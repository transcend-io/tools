import { useMcpApp } from '@transcend-io/mcp-server-base/ui';
import { Spinner } from '@transcend-io/mcp-ui-common';
import { useEffect, useState } from 'react';

import type { ConsentTriageType, CookieTriageAppPayload } from '../../lib/cookieTriageTypes.ts';
import { CookieTriageProvider } from './CookieTriageContext.tsx';
import { CookieTriageLoaded } from './CookieTriageLoaded.tsx';

const CARD = 'mx-auto w-full max-w-view rounded-lg bg-surface-raised px-6 py-5 shadow-sm';
const TITLE = 'mb-1 text-heading-md font-semibold text-content';
const SUBTITLE = 'text-sm text-content-muted';

/** Handles MCP connection, then mounts the session-owned triage queue. */
export function CookieTriageView() {
  const { app, isConnected, connectionError, data } = useMcpApp<CookieTriageAppPayload>({
    appInfo: { name: 'transcend-consent-cookie-triage', version: '1.0.0' },
    capabilities: {
      availableDisplayModes: ['inline', 'fullscreen'],
    },
  });

  const [triageType, setTriageType] = useState<ConsentTriageType | undefined>();

  useEffect(() => {
    if (data?.triageType) {
      setTriageType((current) => current ?? data.triageType);
    }
  }, [data?.triageType]);

  if (connectionError) {
    return (
      <section className={`${CARD} border-l-4 border-l-danger`} role="alert">
        <h1 className={TITLE}>Could not reach the host</h1>
        <p className="text-sm text-danger whitespace-pre-wrap break-words">
          {connectionError.message}
        </p>
        <p className={`${SUBTITLE} mt-2`}>See the browser console for the full error.</p>
      </section>
    );
  }

  if (!isConnected || triageType === undefined) {
    return (
      <section className={CARD} aria-busy="true">
        <Spinner label={!isConnected ? 'Connecting to the host…' : 'Loading triage…'} />
      </section>
    );
  }

  return (
    <CookieTriageProvider key={triageType} triageType={triageType} app={app}>
      <CookieTriageLoaded app={app} />
    </CookieTriageProvider>
  );
}
