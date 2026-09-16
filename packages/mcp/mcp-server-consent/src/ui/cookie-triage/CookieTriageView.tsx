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
  const [dashboardUrl, setDashboardUrl] = useState<string | undefined>();
  const [supportsPermanentDelete, setSupportsPermanentDelete] = useState<boolean | undefined>();

  useEffect(() => {
    if (data?.triageType) {
      setTriageType((current) => current ?? data.triageType);
    }
    if (data?.dashboardUrl) {
      setDashboardUrl((current) => current ?? data.dashboardUrl);
    }
    if (typeof data?.supportsPermanentDelete === 'boolean') {
      setSupportsPermanentDelete((current) => current ?? data.supportsPermanentDelete);
    }
  }, [data?.dashboardUrl, data?.supportsPermanentDelete, data?.triageType]);

  if (connectionError) {
    return (
      <ViewConnectionError
        message={connectionError.message}
        detail="See the browser console for the full error."
      />
    );
  }

  if (
    !isConnected ||
    triageType === undefined ||
    dashboardUrl === undefined ||
    supportsPermanentDelete === undefined
  ) {
    return <ViewLoadingCard label={!isConnected ? 'Connecting to the host…' : 'Loading triage…'} />;
  }

  return (
    <CookieTriageProvider
      key={triageType}
      triageType={triageType}
      dashboardUrl={dashboardUrl}
      supportsPermanentDelete={supportsPermanentDelete}
      app={app}
    >
      <CookieTriageLoaded app={app} />
    </CookieTriageProvider>
  );
}
