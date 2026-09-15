/** Max tooltip width used when flipping left/right of the option. */
export const DISABLED_OPTION_TOOLTIP_MAX_WIDTH_PX = 256;

/** Gap between the option row and the floating tooltip. */
const DISABLED_OPTION_TOOLTIP_GAP_PX = 8;

/** Gap between the trigger and the floating listbox. */
const LISTBOX_GAP_PX = 4;

/** Keep the floating listbox clear of the viewport edges. */
const LISTBOX_VIEWPORT_PADDING_PX = 8;

/** Preferred max height for the purpose listbox (matches max-h-56). */
const LISTBOX_MAX_HEIGHT_PX = 224;

/** Fixed viewport position for a portaled listbox. */
export interface AnchoredListboxPosition {
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

/** Floating tooltip anchored next to a disabled option. */
export interface DisabledOptionTooltip {
  /** Explanation shown in the tooltip */
  text: string;
  /** Viewport Y of the tooltip top edge */
  top: number;
  /** Viewport X of the tooltip left edge */
  left: number;
}

/**
 * Position a listbox in the viewport, flipping upward when there is more room
 * above the trigger and capping height so options stay scrollable.
 */
export function positionAnchoredListbox(
  triggerRect: DOMRectReadOnly,
  viewport: {
    /** Viewport width in CSS pixels */
    width: number;
    /** Viewport height in CSS pixels */
    height: number;
  },
): AnchoredListboxPosition {
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

/** Position a tooltip beside an option row, flipping left when near the right edge. */
export function positionDisabledOptionTooltip(
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
