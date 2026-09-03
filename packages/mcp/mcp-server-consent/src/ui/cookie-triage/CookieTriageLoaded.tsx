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

/**
 * Inline flex basis for the tabs + table region when the host sizes the iframe
 * to content. The root caps at `max-h-[100dvh]` so this can shrink below the
 * basis when the window is shorter; `min-h-0` lets the table scroll internally.
 */
const INLINE_TABLE_REGION_BASIS = 'basis-[min(85dvh,52rem)]';

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
    <div
      className={
        isFullscreen
          ? 'flex h-[100dvh] w-full flex-col overflow-hidden p-6'
          : 'mx-auto flex max-h-[100dvh] max-w-view flex-col overflow-hidden p-6'
      }
    >
      <div className="shrink-0">
        <Header app={app} />
      </div>
      <div className="flex shrink-0 gap-5 pt-2">
        <span className="flex-1 shrink-1 text-sm">
          {itemNoun.charAt(0).toUpperCase() + itemNoun.slice(1)} needing review are grouped by the
          purpose Transcend assigned. Review each row and set a decision. You can also{' '}
          <a className="cursor-pointer" href={appPath}>
            go to the Transcend App
          </a>{' '}
          to review and triage {itemNoun}.
        </span>
        <Overviews />
      </div>
      <div
        className={
          isFullscreen
            ? 'flex min-h-0 flex-1 flex-col pt-5'
            : `flex min-h-0 shrink flex-1 flex-col pt-5 ${INLINE_TABLE_REGION_BASIS}`
        }
      >
        <div className="shrink-0">
          <PurposeTabs />
        </div>
        <PurposeCategorySection purpose={selectedPurpose} />
      </div>
    </div>
  );
}
