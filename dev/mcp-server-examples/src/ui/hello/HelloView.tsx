import { useMcpApp } from '@transcend-io/mcp-server-base/ui';
import { useState } from 'react';

/** Payload shape returned by `example_hello_app` and its refresh companion. */
interface HelloData {
  /** Greeting line, already personalized by the server */
  greeting?: string;
  /** Host the server detected during capability negotiation */
  host?: string;
  /** Capabilities the host declared */
  capabilities?: string[];
  /** Server-side timestamp of the response */
  timestamp?: string;
}

/** Classes shared by every state, so none can drift from the loaded one. */
const CARD = 'rounded-lg bg-surface-raised px-6 py-5 shadow-sm';
const TITLE = 'mb-1 text-heading-md font-semibold text-content';
const SUBTITLE = 'text-sm text-content-muted';

/** One label/value row in the details grid, skipped when the value is empty. */
function DetailRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value) {
    return null;
  }
  return (
    <>
      <dt className="text-content-subtle">{label}</dt>
      <dd className="text-content tabular-nums wrap-anywhere">{value}</dd>
    </>
  );
}

/**
 * Interactive hello-world view for the `example_hello_app` tool.
 *
 * Exercises the parts of the MCP Apps contract a static document cannot: local
 * state, a `tools/call` round trip through the app-only refresh tool, and
 * re-rendering from what the host pushes back. Styled only with utilities from
 * `@transcend-io/mcp-server-base/ui/theme.css`, so every value resolves to a host
 * value or a Transcend token.
 */
export function HelloView() {
  const { data, theme, isConnected, connectionError, toolError, isCallingTool, callTool } =
    useMcpApp<HelloData>({
      appInfo: { name: 'transcend-examples-hello', version: '1.0.0' },
    });

  const [draftName, setDraftName] = useState('');

  if (connectionError) {
    return (
      <section className={`${CARD} border-l-4 border-l-danger`} role="alert">
        <h1 className={TITLE}>Could not reach the host</h1>
        <p className={SUBTITLE}>{connectionError.message}</p>
      </section>
    );
  }

  if (!isConnected) {
    return (
      <section className={CARD} aria-busy="true">
        <h1 className={TITLE}>Connecting…</h1>
        <p className={SUBTITLE}>Waiting for the host handshake.</p>
      </section>
    );
  }

  return (
    <section className={CARD}>
      <h1 className={TITLE}>{data?.greeting ?? 'Hello from Transcend'}</h1>
      <p className={SUBTITLE}>Rendered by an MCP App served over the Model Context Protocol.</p>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          void callTool('example_hello_app_refresh', { name: draftName });
        }}
      >
        <label className="mb-1.5 block text-sm font-medium text-content-muted" htmlFor="hello-name">
          Greet someone else
        </label>
        <div className="flex gap-2">
          <input
            id="hello-name"
            className="min-w-0 flex-1 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-sm text-content placeholder:text-content-subtle"
            value={draftName}
            placeholder="world"
            onChange={(event) => setDraftName(event.target.value)}
          />
          <button
            className="shrink-0 rounded-sm bg-brand px-3.5 py-1.5 text-sm font-medium text-content-inverse transition-colors hover:not-disabled:bg-brand-hovered active:not-disabled:bg-brand-pressed disabled:cursor-default disabled:opacity-60"
            type="submit"
            disabled={isCallingTool}
          >
            {isCallingTool ? 'Updating…' : 'Update'}
          </button>
        </div>
      </form>

      {toolError ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {toolError}
        </p>
      ) : null}

      <dl className="mt-5 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
        <DetailRow label="Host" value={data?.host} />
        <DetailRow label="Capabilities" value={data?.capabilities?.join(', ')} />
        <DetailRow label="Theme" value={theme} />
        <DetailRow label="Server time" value={data?.timestamp} />
      </dl>
    </section>
  );
}
