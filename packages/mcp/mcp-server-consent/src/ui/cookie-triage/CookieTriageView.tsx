import { useMcpApp } from '@transcend-io/mcp-server-base/ui';
import { ViewConnectionError, ViewLoadingCard } from '@transcend-io/mcp-ui-common';
import { useEffect, useState } from 'react';

import type { ConsentTriageType, CookieTriageAppPayload } from '../../lib/cookieTriageTypes.ts';
import { CookieTriageLoaded } from './CookieTriageLoaded.tsx';
import { CookieTriageProvider } from './CookieTriageProvider.tsx';

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
      <ViewConnectionError
        message={connectionError.message}
        detail="See the browser console for the full error."
      />
    );
  }

  if (!isConnected || triageType === undefined) {
    return <ViewLoadingCard label={!isConnected ? 'Connecting to the host…' : 'Loading triage…'} />;
  }

  return (
    <CookieTriageProvider key={triageType} triageType={triageType} app={app}>
      <CookieTriageLoaded app={app} />
    </CookieTriageProvider>
  );
}
