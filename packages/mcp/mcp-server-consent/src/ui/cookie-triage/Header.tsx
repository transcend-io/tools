import type { App } from '@modelcontextprotocol/ext-apps';
import { FullscreenButton, useTool } from '@transcend-io/mcp-server-base/ui';
import { Spinner, SpinnerVariant } from '@transcend-io/mcp-ui-common';
import { memo, useEffect } from 'react';

import {
  useCookieTriageActions,
  useCookieTriageCategories,
  useCookieTriageState,
} from './CookieTriageContext.tsx';
import { RefreshIcon } from './icons.tsx';

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
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap">
        {labels.map((label) => (
          <span
            key={label}
            className="before:content-['·'] before:mr-1 before:ml-1 first:before:content-none uppercase text-sm"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-line bg-surface px-2 py-1 text-sm text-content disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          onClick={() => refresh()}
        >
          {isRefreshing ? (
            <Spinner variant={SpinnerVariant.Small} label={`Refreshing ${itemNoun}`} />
          ) : (
            <RefreshIcon />
          )}
          Refresh
        </button>
        <FullscreenButton app={app} />
      </div>
    </div>
  );
});
