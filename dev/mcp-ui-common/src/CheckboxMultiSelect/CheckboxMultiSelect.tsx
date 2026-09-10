import { memo, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { CheckIcon, ChevronDownIcon } from '../Icons/Icons.tsx';
import {
  DISABLED_OPTION_TOOLTIP_MAX_WIDTH_PX,
  positionAnchoredListbox,
  positionDisabledOptionTooltip,
  type AnchoredListboxPosition,
  type DisabledOptionTooltip,
} from './positionAnchoredListbox.ts';

/** One option in a {@link CheckboxMultiSelect}. */
export interface CheckboxMultiSelectOption {
  /** Stable option id written back via {@link CheckboxMultiSelectProps.onChange} */
  id: string;
  /** Visible label */
  label: string;
  /** When true, the option cannot be toggled */
  disabled?: boolean;
  /** Tooltip shown when the option is disabled and hovered/focused */
  disabledReason?: string;
}

/** Props for {@link CheckboxMultiSelect}. */
export interface CheckboxMultiSelectProps {
  /** Accessible name for the trigger */
  ariaLabel: string;
  /** Accessible name for the portaled listbox */
  listboxLabel: string;
  /** Currently selected option ids */
  selected: readonly string[];
  /** Options shown in the listbox */
  options: readonly CheckboxMultiSelectOption[];
  /** Whether the control is non-interactive */
  disabled?: boolean;
  /** Persist the next selected id list */
  onChange: (selected: string[]) => void | Promise<void>;
  /** Trigger contents for the current selection */
  renderValue: (
    selected: readonly string[],
    options: readonly CheckboxMultiSelectOption[],
  ) => ReactNode;
  /** Optional custom listbox row contents; defaults to the option label */
  renderOption?: (option: CheckboxMultiSelectOption) => ReactNode;
}

/** Checkbox dropdown with a portaled listbox and optional disabled-option tooltips. */
export const CheckboxMultiSelect = memo(function CheckboxMultiSelect({
  ariaLabel,
  listboxLabel,
  selected,
  options,
  disabled = false,
  onChange,
  renderValue,
  renderOption,
}: CheckboxMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [disabledTooltip, setDisabledTooltip] = useState<DisabledOptionTooltip | undefined>();
  const [listboxPosition, setListboxPosition] = useState<AnchoredListboxPosition | undefined>();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const tooltipId = useId();
  const selectedSet = new Set(selected);

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
        positionAnchoredListbox(buttonRef.current.getBoundingClientRect(), {
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

  async function toggleId(id: string): Promise<void> {
    const option = options.find((candidate) => candidate.id === id);
    if (disabled || option?.disabled) {
      return;
    }
    const next = selectedSet.has(id)
      ? selected.filter((candidate) => candidate !== id)
      : [...selected, id];
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
        className={`flex w-full min-w-0 cursor-pointer items-start gap-2 rounded-sm border bg-card px-1.5 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? 'border-focus' : 'border-card-line'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {renderValue(selected, options)}
        </span>
        <span className="mt-0.5 shrink-0 text-on-card-muted" aria-hidden="true">
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
              aria-label={listboxLabel}
              aria-describedby={disabledTooltip ? tooltipId : undefined}
              className="fixed z-[100] w-max overflow-y-auto rounded-sm border border-card-line bg-card py-1 shadow-sm"
              style={{
                top: listboxPosition.top,
                bottom: listboxPosition.bottom,
                left: listboxPosition.left,
                minWidth: listboxPosition.minWidth,
                maxHeight: listboxPosition.maxHeight,
              }}
            >
              {options.map((option) => {
                const checked = selectedSet.has(option.id);
                const optionDisabled = disabled || Boolean(option.disabled);
                return (
                  <label
                    key={option.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 text-sm text-on-card ${
                      optionDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                    } ${
                      checked
                        ? 'bg-fill-brand-subtle'
                        : optionDisabled
                          ? ''
                          : 'hover:bg-card-sunken'
                    }`}
                    role="option"
                    aria-selected={checked}
                    aria-disabled={optionDisabled || undefined}
                    onMouseEnter={(event) => {
                      showDisabledTooltip(event.currentTarget, option.disabledReason);
                    }}
                    onMouseLeave={() => {
                      setDisabledTooltip(undefined);
                    }}
                    onFocus={(event) => {
                      showDisabledTooltip(event.currentTarget, option.disabledReason);
                    }}
                    onBlur={() => {
                      setDisabledTooltip(undefined);
                    }}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={optionDisabled}
                      onChange={() => {
                        void toggleId(option.id);
                      }}
                    />
                    <span className="min-w-0 flex-1 whitespace-nowrap">
                      {renderOption ? renderOption(option) : option.label}
                    </span>
                    <span
                      className={`inline-flex size-4 shrink-0 items-center justify-center text-brand ${
                        checked ? 'opacity-100' : 'opacity-0'
                      }`}
                      aria-hidden="true"
                    >
                      <CheckIcon width={12} height={12} />
                    </span>
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
              className="pointer-events-none fixed z-[100] max-w-64 rounded-sm border border-card-line bg-card px-2.5 py-1.5 text-xs leading-snug text-on-card shadow-sm"
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
