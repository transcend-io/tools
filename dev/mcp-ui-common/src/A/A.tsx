import type { App } from '@modelcontextprotocol/ext-apps';
import type { MouseEvent } from 'react';

/** Props for {@link A}. */
export interface AProps {
  /** Connected MCP App instance used to open the URL via the host */
  app: App | null;
  /** Absolute URL to open */
  href: string;
  /** Visible link text */
  label: string;
}

/**
 * External link that asks the host to open the URL.
 *
 * MCP Apps run in a sandboxed iframe where plain `<a href>` navigation and
 * `window.open` are blocked, so clicks go through {@link App.openLink}.
 */
export function A({ app, href, label }: AProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!app) {
      return;
    }
    void app.openLink({ url: href });
  };

  return (
    <a className="cursor-pointer text-brand-text no-underline" href={href} onClick={onClick}>
      {label}
    </a>
  );
}
