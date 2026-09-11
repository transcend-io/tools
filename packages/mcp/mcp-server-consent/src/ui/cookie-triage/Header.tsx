import type { App } from '@modelcontextprotocol/ext-apps';
import { useTool } from '@transcend-io/mcp-server-base/ui';
import {
  Button,
  ButtonVariant,
  FullscreenButton,
  RefreshIcon,
  ViewToolbar,
} from '@transcend-io/mcp-ui-common';
import { memo, useEffect } from 'react';

import {
  useCookieTriageActions,
  useCookieTriageChrome,
  useCookieTriageMeta,
} from './CookieTriageContext.tsx';
import { triageCopy } from './cookieTriageCopy.ts';

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
  const { triageType } = useCookieTriageMeta();
  const { isRefreshing } = useCookieTriageChrome();
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

  const { plural } = triageCopy(triageType);

  return (
    <ViewToolbar labels={labels}>
      <Button
        variant={ButtonVariant.Icon}
        busy={isRefreshing}
        busyLabel={`Refreshing ${plural}`}
        onClick={() => refresh()}
      >
        <RefreshIcon />
      </Button>
      <FullscreenButton app={app} />
    </ViewToolbar>
  );
});
