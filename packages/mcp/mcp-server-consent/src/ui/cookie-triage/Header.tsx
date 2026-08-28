import type { App } from '@modelcontextprotocol/ext-apps';
import { FullscreenButton } from '@transcend-io/mcp-server-base/ui';
import { memo } from 'react';

import { useCookieTriageState } from './CookieTriageContext';

interface HeaderProps {
  /** Connected MCP App instance used for the fullscreen control */
  app: App | null;
}

export const Header = memo(function Header({ app }: HeaderProps) {
  const { organizationName } = useCookieTriageState();

  const displayDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap">
        {['Scan', organizationName, displayDate].map((label) => (
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
