import type { App } from '@modelcontextprotocol/ext-apps';
import { FullscreenButton, useTool } from '@transcend-io/mcp-server-base/ui';
import { Button, RefreshIcon, ViewToolbar } from '@transcend-io/mcp-ui-common';
import { memo, useEffect } from 'react';

import {
  useCookieTriageActions,
  useCookieTriageCategories,
  useCookieTriageState,
} from './CookieTriageContext.tsx';

interface HeaderProps {
  /** Connected MCP App instance used for org lookup and the fullscreen control */
  app: App | null;
}

interface OrganizationPayload {
  /** Display name of the signed-in organization */
  name: string;
}

export const Header = memo(function Header({ app }: HeaderProps) {
  const organization = useTool<OrganizationPayload>(app, 'admin_get_organization');
  const { triageType } = useCookieTriageState();
  const categories = useCookieTriageCategories();
  const { refresh } = useCookieTriageActions();

  useEffect(() => {
    if (!app) {
      return;
    }
    void organization.call({});
  }, [app, organization.call]);

  const displayDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const labels = ['Scan', organization.data?.name, displayDate].filter(
    (label): label is string => typeof label === 'string' && label.length > 0,
  );

  const itemNoun = triageType === 'cookies' ? 'cookies' : 'data flows';
  const isRefreshing = Object.values(categories).some(
    (category) => category.loadStatus === 'loading',
  );

  return (
    <ViewToolbar labels={labels}>
      <Button busy={isRefreshing} busyLabel={`Refreshing ${itemNoun}`} onClick={() => refresh()}>
        {isRefreshing ? null : <RefreshIcon />}
        Refresh
      </Button>
      <FullscreenButton app={app} />
    </ViewToolbar>
  );
});
