import { memo, type KeyboardEvent, type ReactNode } from 'react';

import { CountBadge, CountBadgeTone } from '../Badge/Badge.tsx';

/** One tab in a {@link Tabs} list. */
export interface TabItem {
  /** Stable id used for selection and element ids */
  id: string;
  /** Visible label */
  label: ReactNode;
  /** Optional count shown in a pill */
  count?: number;
  /** When true, the count badge shows a shimmer placeholder */
  countBusy?: boolean;
}

/** Props for {@link Tabs}. */
export interface TabsProps {
  /** Ordered tabs */
  items: readonly TabItem[];
  /** Currently selected tab id */
  selectedId: string;
  /** Called when the user activates a tab */
  onSelect: (id: string) => void;
  /** Accessible name for the tablist */
  ariaLabel: string;
  /** Prefix for tab element ids; defaults to `mcp-tab` */
  idPrefix?: string;
}

/**
 * Underline tablist with optional count badges and arrow-key navigation.
 *
 * Callers own selection state; this component only renders chrome and a11y.
 */
export const Tabs = memo(function Tabs({
  items,
  selectedId,
  onSelect,
  ariaLabel,
  idPrefix = 'mcp-tab',
}: TabsProps) {
  function focusAndSelect(id: string): void {
    onSelect(id);
    document.getElementById(`${idPrefix}-${id}`)?.focus();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    let nextIndex: number | undefined;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % items.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + items.length) % items.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = items[nextIndex];
    if (next !== undefined) {
      focusAndSelect(next.id);
    }
  }

  return (
    <div className="border-b border-line-subtle">
      <div className="flex flex-wrap gap-x-6 gap-y-1" role="tablist" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const isActive = item.id === selectedId;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              id={`${idPrefix}-${item.id}`}
              className={
                isActive
                  ? 'relative -mb-px flex cursor-pointer items-center gap-1 border-b-2 border-brand bg-transparent pb-2 pt-1 text-sm font-medium text-brand'
                  : 'relative -mb-px flex cursor-pointer items-center gap-1 border-b-2 border-transparent bg-transparent pb-2 pt-1 text-sm font-medium text-on-card-subtle'
              }
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              <span>{item.label}</span>
              {item.count !== undefined ? (
                <CountBadge
                  count={item.count}
                  busy={item.countBusy}
                  tone={isActive ? CountBadgeTone.Active : CountBadgeTone.Idle}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
});
