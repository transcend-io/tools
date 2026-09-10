import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button, ButtonVariant } from '../Button/Button.tsx';

/** Props for {@link ConfirmDialog}. */
export interface ConfirmDialogProps {
  /** Dialog title */
  title: string;
  /** Supporting copy under the title */
  children: ReactNode;
  /** Confirm button label */
  confirmLabel: string;
  /** Cancel button label */
  cancelLabel?: string;
  /**
   * Accessible busy label while {@link ConfirmDialogProps.busy} is true.
   * Defaults to the confirm label.
   */
  busyLabel?: string;
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Called when the user cancels or dismisses */
  onCancel: () => void;
  /** Disable actions while a confirm handler is in flight */
  busy?: boolean;
}

/**
 * In-app confirm dialog for sandboxed MCP App iframes.
 *
 * Hosts render views in a `srcdoc` sandbox without `allow-modals`, so browser
 * `confirm()` / `alert()` are ignored. Use this instead.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  busyLabel,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onCancel();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [busy, onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-sm border border-card-line bg-card p-4 shadow-sm"
      >
        <h2 id={titleId} className="text-base font-medium text-on-card font-semibold">
          {title}
        </h2>
        <div id={descriptionId} className="mt-2 text-sm text-on-card-muted">
          {children}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant={ButtonVariant.Secondary} disabled={busy} autoFocus onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={ButtonVariant.Primary}
            busy={busy}
            busyLabel={busyLabel ?? confirmLabel}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
