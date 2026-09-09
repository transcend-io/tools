import type { App } from '@modelcontextprotocol/ext-apps';
import { memo, useEffect, type SVGProps } from 'react';

import { Button, ButtonVariant } from '../Button/Button.tsx';
import { useHostDisplayMode } from '../useHostDisplayMode/useHostDisplayMode.ts';

type IconProps = SVGProps<SVGSVGElement>;

/** Expand corners icon for entering fullscreen display mode. */
function ExpandIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width={16} height={16} {...props}>
      <path
        d="M2.5 6.5V2.5H6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5V2.5H9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 9.5V13.5H6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 9.5V13.5H9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Collapse corners icon for leaving fullscreen display mode. */
function CollapseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width={16} height={16} {...props}>
      <path
        d="M6.5 2.5V6.5H2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 2.5V6.5H13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 13.5V9.5H2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 13.5V9.5H13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
