import type { App } from '@modelcontextprotocol/ext-apps';
import { memo, useEffect } from 'react';

import { Button, ButtonVariant } from '../Button/Button.tsx';
import { CollapseIcon, ExpandIcon } from '../Icons/Icons.tsx';
import { useHostDisplayMode } from '../useHostDisplayMode/useHostDisplayMode.ts';

/** Props for {@link FullscreenButton}. */
export interface FullscreenButtonProps {
  /** Connected MCP App instance, or null while connecting */
  app: App | null;
  /** Optional extra class names merged onto the button */
  className?: string;
}

/**
 * Toggle between inline and fullscreen host display modes.
 *
 * Uses {@link useHostDisplayMode} internally. Renders nothing when the host
 * does not advertise fullscreen.
 */
export const FullscreenButton = memo(function FullscreenButton({
  app,
  className,
}: FullscreenButtonProps) {
  const { canFullscreen, isFullscreen, requestDisplayMode } = useHostDisplayMode(app);

  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return;
      }
      // Leave Escape for open dialogs / listboxes (e.g. ConfirmDialog, PurposeMultiSelect).
      if (document.querySelector('[aria-modal="true"], [role="listbox"]')) {
        return;
      }
      event.preventDefault();
      void requestDisplayMode('inline');
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen, requestDisplayMode]);

  if (!canFullscreen) {
    return null;
  }

  return (
    <Button
      type="button"
      className={className}
      aria-pressed={isFullscreen}
      variant={ButtonVariant.Icon}
      onClick={() => {
        void requestDisplayMode(isFullscreen ? 'inline' : 'fullscreen');
      }}
    >
      {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
    </Button>
  );
});
