import type { ReactNode } from 'react';

/**
 * Inline flex basis for the main content region when the host sizes the iframe
 * to content. The root caps at `max-h-[100dvh]` so this can shrink below the
 * basis when the window is shorter; `min-h-0` lets nested tables scroll.
 */
export const APP_SHELL_INLINE_CONTENT_BASIS = 'basis-[min(85dvh,32rem)]';

/** Props for {@link AppShell}. */
export interface AppShellProps {
  /** Whether the host is showing the view fullscreen */
  isFullscreen: boolean;
  /** Sticky header region (toolbar, title, etc.) */
  header: ReactNode;
  /** Optional band between header and the scrollable body */
  subheader?: ReactNode;
  /** Main body; grows and scrolls inside the shell */
  children: ReactNode;
  /**
   * Extra classes on the scrollable body wrapper when inline.
   * Defaults to {@link APP_SHELL_INLINE_CONTENT_BASIS}.
   */
  inlineContentClassName?: string;
}

const APP_SHELL_CLASSNAME = 'bg-card flex flex-col overflow-hidden p-6 text-on-card';

/**
 * Fullscreen-aware page shell for interactive MCP Apps.
 *
 * Keeps a fixed header, optional subheader, and a flex body that scrolls
 * internally so the host iframe does not trap nested overflow.
 */
export function AppShell({
  isFullscreen,
  header,
  subheader,
  children,
  inlineContentClassName = APP_SHELL_INLINE_CONTENT_BASIS,
}: AppShellProps) {
  return (
    <div
      className={
        isFullscreen
          ? `h-[90dvh] w-full ${APP_SHELL_CLASSNAME}`
          : `mx-auto max-w-view ${APP_SHELL_CLASSNAME}`
      }
    >
      <div className="shrink-0">{header}</div>
      {subheader ? <div className="flex shrink-0 gap-5 pt-2">{subheader}</div> : null}
      <div
        className={
          isFullscreen
            ? 'flex min-h-0 flex-1 flex-col pt-5'
            : `flex min-h-0 shrink flex-1 flex-col pt-5 ${inlineContentClassName}`
        }
      >
        {children}
      </div>
    </div>
  );
}
