import type { App } from '@modelcontextprotocol/ext-apps';
import { AppShell, useHostDisplayMode, A, ConfirmDialog } from '@transcend-io/mcp-ui-common';
import { useCallback, useState } from 'react';

import {
  CookieTriageDeleteRequestContext,
  useCookieTriageActions,
  useCookieTriageMeta,
  useSelectedPurpose,
  type CookieTriageDeleteRequest,
} from './CookieTriageContext.tsx';
import { triageCopy } from './cookieTriageCopy.ts';
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
  const { triageType, dashboardUrl: dashboardBaseUrl } = useCookieTriageMeta();
  const selectedPurpose = useSelectedPurpose();
  const { remove } = useCookieTriageActions();
  const { isFullscreen } = useHostDisplayMode(app);
  const { singular, plural, pluralTitle, dashboardUrl } = triageCopy(triageType, dashboardBaseUrl);
  const [deleteTarget, setDeleteTarget] = useState<CookieTriageDeleteRequest | undefined>();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const requestDelete = useCallback((target: CookieTriageDeleteRequest) => {
    setDeleteError(undefined);
    setDeleteTarget(target);
  }, []);

  async function onConfirmDelete(): Promise<void> {
    if (!deleteTarget || deleteBusy) {
      return;
    }
    setDeleteBusy(true);
    setDeleteError(undefined);
    try {
      await remove(deleteTarget.purpose, deleteTarget.name);
      setDeleteTarget(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to delete ${singular}`;
      setDeleteError(message);
      console.error('[cookie-triage] remove failed', error);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <CookieTriageDeleteRequestContext.Provider value={requestDelete}>
      <AppShell
        isFullscreen={isFullscreen}
        header={<Header app={app} />}
        subheader={
          <>
            <span className="flex-1 shrink-1 text-sm">
              {pluralTitle} needing review are grouped by the purpose Transcend assigned. Review
              each row and set a decision. You can also{' '}
              <A app={app} href={dashboardUrl} label="go to the Transcend App" /> to review and
              triage {plural}.
            </span>
            <Overviews />
          </>
        }
      >
        <div className="shrink-0">
          <PurposeTabs />
        </div>
        <PurposeCategorySection app={app} purpose={selectedPurpose} />
      </AppShell>
      {deleteTarget ? (
        <ConfirmDialog
          title={`Delete ${singular} "${deleteTarget.itemLabel}"?`}
          confirmLabel="Delete permanently"
          busyLabel="Deleting"
          busy={deleteBusy}
          onCancel={() => {
            if (!deleteBusy) {
              setDeleteError(undefined);
              setDeleteTarget(undefined);
            }
          }}
          onConfirm={() => {
            void onConfirmDelete();
          }}
        >
          <p>
            This permanently removes the {singular} from your consent manager. It cannot be undone.
          </p>
          <p className="mt-2">Prefer Junk if you only want to hide it from review.</p>
          {deleteError ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {deleteError}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </CookieTriageDeleteRequestContext.Provider>
  );
}
