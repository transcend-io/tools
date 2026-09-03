import type { App } from '@modelcontextprotocol/ext-apps';
import { useHostDisplayMode } from '@transcend-io/mcp-server-base/ui';

import { useCookieTriageState, useSelectedPurpose } from './CookieTriageContext.tsx';
import { Header } from './Header.tsx';
import { Overviews } from './Overviews.tsx';
import { PurposeCategorySection } from './PurposeCategorySection.tsx';
import { PurposeTabs } from './PurposeTabs.tsx';

/** Props for the loaded cookie triage UI */
export interface CookieTriageLoadedProps {
  /** Connected MCP App instance used for host display-mode requests */
  app: App | null;
}

/** Loaded-state cookie triage UI */
export function CookieTriageLoaded({ app }: CookieTriageLoadedProps) {
  const { triageType } = useCookieTriageState();
  const selectedPurpose = useSelectedPurpose();
  const { isFullscreen } = useHostDisplayMode(app);
  const itemNoun = triageType === 'cookies' ? 'cookies' : 'data flows';
  const appPath =
    triageType === 'cookies'
      ? 'https://app.transcend.io/consent-manager/cookies'
      : 'https://app.transcend.io/consent-manager/data-flows';

  return (
    <div className={isFullscreen ? 'w-full p-6' : 'mx-auto max-w-view p-6'}>
      <Header app={app} />
      <div className="flex flex-1 gap-5 pt-2">
        <span className="flex-1 shrink-1 text-sm">
          {itemNoun.charAt(0).toUpperCase() + itemNoun.slice(1)} needing review are grouped by the
          purpose Transcend assigned. Review each row and set a decision. You can also{' '}
          <a href={appPath}>go to the Transcend App</a> to review and triage {itemNoun}.
        </span>
        <Overviews />
      </div>
      <div className="pt-5">
        <PurposeTabs />
        <PurposeCategorySection purpose={selectedPurpose} />
      </div>
    </div>
  );
}
