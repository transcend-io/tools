import type { App } from '@modelcontextprotocol/ext-apps';
import { FullscreenButton, useTool } from '@transcend-io/mcp-server-base/ui';
import { memo, useEffect } from 'react';

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
      <FullscreenButton app={app} />
    </div>
  );
});
