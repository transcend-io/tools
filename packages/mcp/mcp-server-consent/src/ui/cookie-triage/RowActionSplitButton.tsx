import {
  ApproveCheckIcon,
  ChevronDownIcon,
  PencilIcon,
  positionAnchoredListbox,
  TrashIcon,
  WarningIcon,
  type AnchoredListboxPosition,
} from '@transcend-io/mcp-ui-common';
import { memo, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import {
  CookieTriageRowAction,
  rowActionLabel,
  rowActionMenuItems,
  type CookieTriageRowAction as CookieTriageRowActionValue,
} from './rowActions.ts';

interface RowActionSplitButtonProps {
  /** Current primary action shown on the main segment */
  primary: CookieTriageRowActionValue;
  /** Whether permanent delete is available on this host */
  supportsPermanentDelete: boolean;
  /** Whether the control is non-interactive */
  disabled?: boolean;
  /** Whether a mutation is in flight */
  busy?: boolean;
  /** Remember a newly selected primary from the chevron menu */
  onPrimaryChange: (action: CookieTriageRowActionValue) => void;
  /** Execute the current primary (main segment click) */
  onExecute: (action: CookieTriageRowActionValue) => void;
}

/** Shared look for both halves of the split control (matches Action buttons). */
const SEGMENT_BASE =
  'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center border border-card-line bg-card text-sm font-medium text-on-card hover:not-disabled:bg-card-sunken disabled:cursor-not-allowed disabled:opacity-60';

/** Icon for a row-action menu item. */
function rowActionIcon(action: CookieTriageRowActionValue): ReactNode {
  switch (action) {
    case CookieTriageRowAction.Approve:
      return <ApproveCheckIcon width={16} height={16} />;
    case CookieTriageRowAction.Junk:
      return <TrashIcon width={16} height={16} />;
    case CookieTriageRowAction.DeleteRecord:
      return <WarningIcon width={16} height={16} />;
    case CookieTriageRowAction.LeaveComment:
      return <PencilIcon width={16} height={16} />;
    default:
      return null;
  }
}

/**
 * Split button: fixed-width primary action + chevron menu of the remaining row actions.
 *
 * Menu selection only updates the primary label; the main segment executes on click.
 */
export const RowActionSplitButton = memo(function RowActionSplitButton({
  primary,
  supportsPermanentDelete,
  disabled = false,
  busy = false,
  onPrimaryChange,
  onExecute,
}: RowActionSplitButtonProps) {
  const [open, setOpen] = useState(false);
  const [listboxPosition, setListboxPosition] = useState<AnchoredListboxPosition | undefined>();
  const rootRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const menuItems = rowActionMenuItems(primary, supportsPermanentDelete);
  const inactive = disabled || busy;

  useLayoutEffect(() => {
    if (!open || !chevronRef.current) {
      setListboxPosition(undefined);
      return undefined;
    }

    function updateListboxPosition(): void {
      if (!chevronRef.current || !rootRef.current) {
        return;
      }
      // Anchor to the full split control so the menu aligns with both segments.
      setListboxPosition(
        positionAnchoredListbox(rootRef.current.getBoundingClientRect(), {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      );
    }

    updateListboxPosition();
    window.addEventListener('scroll', updateListboxPosition, true);
    window.addEventListener('resize', updateListboxPosition);
    return () => {
      window.removeEventListener('scroll', updateListboxPosition, true);
      window.removeEventListener('resize', updateListboxPosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onPointerDown(event: MouseEvent): void {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listboxRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return;
      }
      // Claim Escape so fullscreen exit (and similar host handlers) do not steal it.
      event.preventDefault();
      setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="inline-flex" ref={rootRef} role="group" aria-label="Row action">
      <button
        type="button"
        className={`${SEGMENT_BASE} min-w-19 rounded-l-sm rounded-r-none px-2.5`}
        disabled={inactive}
        aria-busy={busy || undefined}
        onClick={() => {
          onExecute(primary);
        }}
      >
        {rowActionLabel(primary)}
      </button>
      <button
        ref={chevronRef}
        type="button"
        className={`${SEGMENT_BASE} rounded-l-none rounded-r-sm border-l-0 px-1.5 text-on-card-muted`}
        disabled={inactive}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label="More row actions"
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <ChevronDownIcon width={16} height={16} />
      </button>
      {open && listboxPosition
        ? createPortal(
            <div
              ref={listboxRef}
              id={listboxId}
              role="menu"
              aria-label="Row actions"
              className="fixed z-[100] w-max overflow-hidden rounded-md border border-card-line bg-card shadow-sm"
              style={{
                top: listboxPosition.top,
                bottom: listboxPosition.bottom,
                left: listboxPosition.left,
                minWidth: Math.max(listboxPosition.minWidth, 176),
                maxHeight: listboxPosition.maxHeight,
              }}
            >
              {menuItems.map((action, index) => {
                const isDanger = action === CookieTriageRowAction.DeleteRecord;
                return (
                  <button
                    key={action}
                    type="button"
                    role="menuitem"
                    className={`flex w-full cursor-pointer items-center gap-2.5 bg-card px-3 py-2.5 text-left text-sm hover:bg-card-sunken ${
                      index > 0 ? 'border-t border-card-line' : ''
                    } ${isDanger ? 'text-danger' : 'text-on-card'}`}
                    onClick={() => {
                      onPrimaryChange(action);
                      setOpen(false);
                    }}
                  >
                    <span
                      className="inline-flex size-4 shrink-0 items-center justify-center"
                      aria-hidden="true"
                    >
                      {rowActionIcon(action)}
                    </span>
                    <span>{rowActionLabel(action)}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
});
