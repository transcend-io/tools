import type { App } from '@modelcontextprotocol/ext-apps';
import { useHostDisplayMode } from '@transcend-io/mcp-server-base/ui';

import { useSelectedPurpose } from './CookieTriageContext.tsx';
import { Header } from './Header.tsx';
import { Overviews } from './Overviews.tsx';
import { PurposeCategorySection } from './PurposeCategorySection.tsx';
import { PurposeTabs } from './PurposeTabs.tsx';

/** Props for the loaded cookie triage UI */
export interface CookieTriageLoadedProps {
  /** Connected MCP App instance used for host display-mode requests */
  app: App | null;
  /** Non-fatal tool error shown above the loaded content */
  toolError?: string;
}

/** Loaded-state cookie triage UI */
export function CookieTriageLoaded({ app, toolError }: CookieTriageLoadedProps) {
  const selectedPurpose = useSelectedPurpose();
  const { isFullscreen } = useHostDisplayMode(app);

  return (
    <div className={isFullscreen ? 'w-full p-6' : 'mx-auto max-w-view p-6'}>
      <Header app={app} />
      <div className="flex flex-1 gap-5 pt-2">
        <span className="flex-1 shrink-1 text-sm">
          Cookies are grouped by the purpose Transcend suggested. Approve a group in bulk, or review
          the flagged row individually. You can also{' '}
          <a href="https://app.transcend.io/consent-manager/cookies">go to the Transcend App</a> to
          review and triage cookies.
        </span>
        <Overviews />
      </div>
      {toolError ? (
        <p className="text-sm text-danger" role="alert">
          {toolError}
        </p>
      ) : null}
      {selectedPurpose !== undefined ? (
        <div className="pt-5">
          <PurposeTabs />
          <PurposeCategorySection purpose={selectedPurpose} />
        </div>
      ) : null}
    </div>
  );
}
