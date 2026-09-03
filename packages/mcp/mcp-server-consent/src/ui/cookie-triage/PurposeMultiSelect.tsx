import { memo, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { CookieTriagePurposeOption } from '../../lib/cookieTriageTypes.ts';
import {
  COOKIE_TRIAGE_PURPOSE_LABELS,
  isUnknownCookiePurposeSlug,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import { ChevronDownIcon } from './icons.tsx';
import { purposeBadgeClass } from './purposeBadgeClasses.ts';

/** Built-in Essential purpose slug (case-insensitive match). */
const ESSENTIAL_PURPOSE_SLUG = 'Essential';

/** Tooltip when Essential is selected and another purpose cannot be chosen. */
export const ESSENTIAL_BLOCKS_OTHER_PURPOSES_TOOLTIP =
  'Essential cannot be combined with other purposes. Clear Essential first.';

/** Tooltip when a non-Essential purpose is selected and Essential cannot be chosen. */
export const OTHER_PURPOSE_BLOCKS_ESSENTIAL_TOOLTIP =
  'Essential cannot be combined with other purposes. Clear the other purposes first.';

/** Max tooltip width used when flipping left/right of the option. */
const DISABLED_OPTION_TOOLTIP_MAX_WIDTH_PX = 256;

/** Gap between the option row and the floating tooltip. */
const DISABLED_OPTION_TOOLTIP_GAP_PX = 8;

/** Gap between the trigger and the floating listbox. */
const LISTBOX_GAP_PX = 4;

/** Keep the floating listbox clear of the viewport edges. */
const LISTBOX_VIEWPORT_PADDING_PX = 8;

/** Preferred max height for the purpose listbox (matches max-h-56). */
const LISTBOX_MAX_HEIGHT_PX = 224;

/** Fixed viewport position for the portaled purpose listbox. */
export interface PurposeListboxPosition {
  /** CSS `top` when opening downward */
  top?: number;
  /** CSS `bottom` when opening upward */
  bottom?: number;
  /** CSS `left` aligned to the trigger */
  left: number;
  /** Minimum width matching the trigger */
  minWidth: number;
  /** Scrollable height capped to available viewport space */
  maxHeight: number;
}

interface PurposeMultiSelectProps {
  /** Accessible name prefix (usually the cookie / data-flow name) */
  itemName: string;
  /** Currently assigned purpose slugs */
  selected: readonly string[];
  /** Org purpose options from `consent_list_purposes` */
  options: readonly CookieTriagePurposeOption[];
  /** Whether mutations are in flight for this row */
  disabled?: boolean;
  /** Persist the next purpose list */
  onChange: (trackingPurposes: string[]) => void | Promise<void>;
}

/** Floating tooltip anchored next to a disabled purpose option. */
interface DisabledOptionTooltip {
  /** Explanation shown in the tooltip */
  text: string;
  /** Viewport Y of the tooltip top edge */
  top: number;
  /** Viewport X of the tooltip left edge */
  left: number;
}

/** Whether a tracking-purpose slug is Essential. */
export function isEssentialPurposeSlug(slug: string): boolean {
  return slug.toLowerCase() === ESSENTIAL_PURPOSE_SLUG.toLowerCase();
}

/**
 * Why a purpose option is locked by Essential exclusivity, or `undefined` if selectable.
 *
 * Already-selected options stay unlocked so they can be cleared.
 */
export function purposeOptionExclusiveDisabledReason(
  slug: string,
  selected: readonly string[],
): string | undefined {
  const checked = selected.some((candidate) => candidate === slug);
  if (checked) {
    return undefined;
  }

  const hasEssential = selected.some(isEssentialPurposeSlug);
  const hasNonEssential = selected.some((candidate) => !isEssentialPurposeSlug(candidate));

  if (isEssentialPurposeSlug(slug)) {
    return hasNonEssential ? OTHER_PURPOSE_BLOCKS_ESSENTIAL_TOOLTIP : undefined;
  }
  return hasEssential ? ESSENTIAL_BLOCKS_OTHER_PURPOSES_TOOLTIP : undefined;
}

/** Position a tooltip beside an option row, flipping left when near the right edge. */
function positionDisabledOptionTooltip(
  optionElement: HTMLElement,
  text: string,
): DisabledOptionTooltip {
  const rect = optionElement.getBoundingClientRect();
  const spaceOnRight = window.innerWidth - rect.right - DISABLED_OPTION_TOOLTIP_GAP_PX;
  const placeOnRight = spaceOnRight >= DISABLED_OPTION_TOOLTIP_MAX_WIDTH_PX;
  return {
    text,
    top: Math.max(8, rect.top),
    left: placeOnRight
      ? rect.right + DISABLED_OPTION_TOOLTIP_GAP_PX
      : Math.max(
          8,
          rect.left - DISABLED_OPTION_TOOLTIP_GAP_PX - DISABLED_OPTION_TOOLTIP_MAX_WIDTH_PX,
        ),
  };
}

/**
 * Position the purpose listbox in the viewport, flipping upward when there is
 * more room above the trigger and capping height so options stay scrollable.
 */
export function positionPurposeListbox(
  triggerRect: DOMRectReadOnly,
  viewport: {
    /** Viewport width in CSS pixels */
    width: number;
    /** Viewport height in CSS pixels */
    height: number;
  },
): PurposeListboxPosition {
  const spaceBelow =
    viewport.height - triggerRect.bottom - LISTBOX_GAP_PX - LISTBOX_VIEWPORT_PADDING_PX;
  const spaceAbove = triggerRect.top - LISTBOX_GAP_PX - LISTBOX_VIEWPORT_PADDING_PX;
  const openUpward = spaceBelow < LISTBOX_MAX_HEIGHT_PX && spaceAbove > spaceBelow;
  const available = Math.max(0, openUpward ? spaceAbove : spaceBelow);
  const maxLeft = Math.max(
    LISTBOX_VIEWPORT_PADDING_PX,
    viewport.width - triggerRect.width - LISTBOX_VIEWPORT_PADDING_PX,
  );

  return {
    left: Math.min(Math.max(LISTBOX_VIEWPORT_PADDING_PX, triggerRect.left), maxLeft),
    minWidth: triggerRect.width,
    maxHeight: Math.min(LISTBOX_MAX_HEIGHT_PX, available),
    ...(openUpward
      ? { bottom: viewport.height - triggerRect.top + LISTBOX_GAP_PX }
      : { top: triggerRect.bottom + LISTBOX_GAP_PX }),
  };
}

/** Resolve a display label for a purpose slug. */
export function purposeSlugLabel(
  slug: string,
  options: readonly CookieTriagePurposeOption[],
): string {
  const fromOptions = options.find((option) => option.slug === slug)?.label;
  if (fromOptions) {
    return fromOptions;
  }
  return COOKIE_TRIAGE_PURPOSE_LABELS[slug as CookieTriagePurposeCategory] ?? slug;
}

/**
 * Merge org options with any assigned slugs missing from the catalog so the
 * multi-select can still show and toggle them.
 *
 * Unknown is never offered as a selectable option.
 */
export function mergePurposeSelectOptions(
  options: readonly CookieTriagePurposeOption[],
  selected: readonly string[],
): CookieTriagePurposeOption[] {
  const catalog = options.filter((option) => !isUnknownCookiePurposeSlug(option.slug));
  const known = new Set(catalog.map((option) => option.slug));
  const extras = selected
    .filter((slug) => slug.length > 0 && !isUnknownCookiePurposeSlug(slug) && !known.has(slug))
    .map((slug) => ({ slug, label: purposeSlugLabel(slug, catalog) }));
  return extras.length === 0 ? [...catalog] : [...extras, ...catalog];
}

/**
 * Order selected purpose slugs by the option list order (unknowns keep their relative order).
 */
export function orderSelectedPurposeSlugs(
  selected: readonly string[],
  options: readonly CookieTriagePurposeOption[],
): string[] {
  const selectedSet = new Set(selected);
  const ordered: string[] = [];
  for (const option of options) {
    if (selectedSet.has(option.slug)) {
      ordered.push(option.slug);
      selectedSet.delete(option.slug);
    }
  }
  for (const slug of selected) {
    if (selectedSet.has(slug)) {
      ordered.push(slug);
      selectedSet.delete(slug);
    }
  }
  return ordered;
}

/** Checkbox dropdown for assigning one or more tracking purposes. */
export const PurposeMultiSelect = memo(function PurposeMultiSelect({
  itemName,
  selected,
  options,
  disabled = false,
  onChange,
}: PurposeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [disabledTooltip, setDisabledTooltip] = useState<DisabledOptionTooltip | undefined>();
  const [listboxPosition, setListboxPosition] = useState<PurposeListboxPosition | undefined>();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const tooltipId = useId();
  const selectOptions = mergePurposeSelectOptions(options, selected);
  const orderedSelected = orderSelectedPurposeSlugs(selected, selectOptions);
  const selectedSet = new Set(orderedSelected);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setListboxPosition(undefined);
      return undefined;
    }

    function updateListboxPosition(): void {
      if (!buttonRef.current) {
        return;
      }
      setListboxPosition(
        positionPurposeListbox(buttonRef.current.getBoundingClientRect(), {
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
      setDisabledTooltip(undefined);
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
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    function clearDisabledTooltip(): void {
      setDisabledTooltip(undefined);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', clearDisabledTooltip, true);
    window.addEventListener('resize', clearDisabledTooltip);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', clearDisabledTooltip, true);
      window.removeEventListener('resize', clearDisabledTooltip);
    };
  }, [open]);

  async function toggleSlug(slug: string): Promise<void> {
    if (disabled || purposeOptionExclusiveDisabledReason(slug, orderedSelected)) {
      return;
    }
    const next = selectedSet.has(slug)
      ? orderedSelected.filter((candidate) => candidate !== slug)
      : orderSelectedPurposeSlugs([...orderedSelected, slug], selectOptions);
    await onChange(next);
  }

  function showDisabledTooltip(optionElement: HTMLElement, reason: string | undefined): void {
    if (!reason) {
      setDisabledTooltip(undefined);
      return;
    }
    setDisabledTooltip(positionDisabledOptionTooltip(optionElement, reason));
  }

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm border border-line bg-surface px-1.5 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Tracking purposes for ${itemName}`}
        disabled={disabled || selectOptions.length === 0}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1">
          {orderedSelected.length === 0 ? (
            <span className="inline-flex h-6 items-center rounded-sm bg-fill-neutral px-1.5 text-sm text-content-muted">
              Select
            </span>
          ) : (
            orderedSelected.map((slug) => (
              <span
                key={slug}
                className={`inline-flex h-6 max-w-full items-center truncate rounded-sm px-1.5 text-sm text-content-inverse ${purposeBadgeClass(slug)}`}
              >
                {purposeSlugLabel(slug, selectOptions)}
              </span>
            ))
          )}
        </span>
        <span className="shrink-0 text-content-muted" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>
      {open && listboxPosition
        ? createPortal(
            <div
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-multiselectable="true"
              aria-label={`Choose tracking purposes for ${itemName}`}
              aria-describedby={disabledTooltip ? tooltipId : undefined}
              className="fixed z-[100] w-max overflow-y-auto rounded-sm border border-line bg-surface-raised py-1 shadow-sm"
              style={{
                top: listboxPosition.top,
                bottom: listboxPosition.bottom,
                left: listboxPosition.left,
                minWidth: listboxPosition.minWidth,
                maxHeight: listboxPosition.maxHeight,
              }}
            >
              {selectOptions.map((option) => {
                const checked = selectedSet.has(option.slug);
                const exclusiveDisabledReason = purposeOptionExclusiveDisabledReason(
                  option.slug,
                  orderedSelected,
                );
                const optionDisabled = disabled || Boolean(exclusiveDisabledReason);
                return (
                  <label
                    key={option.slug}
                    className={`flex items-center gap-2 px-2.5 py-1.5 text-sm text-content ${
                      optionDisabled
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:bg-surface-sunken'
                    }`}
                    role="option"
                    aria-selected={checked}
                    aria-disabled={optionDisabled || undefined}
                    onMouseEnter={(event) => {
                      showDisabledTooltip(event.currentTarget, exclusiveDisabledReason);
                    }}
                    onMouseLeave={() => {
                      setDisabledTooltip(undefined);
                    }}
                    onFocus={(event) => {
                      showDisabledTooltip(event.currentTarget, exclusiveDisabledReason);
                    }}
                    onBlur={() => {
                      setDisabledTooltip(undefined);
                    }}
                  >
                    <input
                      type="checkbox"
                      className={`size-3.5 accent-brand-text ${
                        optionDisabled ? 'pointer-events-none' : ''
                      }`}
                      checked={checked}
                      disabled={optionDisabled}
                      onChange={() => {
                        void toggleSlug(option.slug);
                      }}
                    />
                    <span className="whitespace-nowrap">{option.label}</span>
                  </label>
                );
              })}
            </div>,
            document.body,
          )
        : null}
      {disabledTooltip
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none fixed z-[100] max-w-64 rounded-sm border border-line bg-surface-raised px-2.5 py-1.5 text-xs leading-snug text-content shadow-sm"
              style={{
                top: disabledTooltip.top,
                left: disabledTooltip.left,
                maxWidth: DISABLED_OPTION_TOOLTIP_MAX_WIDTH_PX,
              }}
            >
              {disabledTooltip.text}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
});
