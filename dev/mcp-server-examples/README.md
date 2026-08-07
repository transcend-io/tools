# `@transcend-io/mcp-server-examples`

Reference MCP App views and capability-aware tools, as a real MCP server you can
point a host at. Development only — this package is `private` and is never
published.

## Running it

```bash
pnpm mcp:inspect --examples  # the official Inspector, over stdio
```

That builds the package first, then serves both examples below, rebuilding the
`hello` view on save.

## Why it is not published

An MCP App view ships as one self-contained document — React, the view's CSS, and
the design tokens all inlined — which is roughly 550 KB per view. While the hello
view lived in `@transcend-io/mcp-server-docs` it was 94% of that package's
published bytes, downloaded by everyone who installs the umbrella server or the
CLI, for a demo tool no end user has a reason to call.

Keeping it here makes that structural rather than a rule someone has to remember:
a `private` package cannot leak into a tarball, and `@transcend-io/mcp` has no
dependency on it, so the umbrella server does not serve it. Only `--examples`
does.

## What the hello example demonstrates

`src/tools/hello_app.ts` is the worked example for `defineToolWithCapabilities`.
One registration serves three experiences, chosen by what the host declared in
`initialize`:

| Host capability | What the caller gets                                        |
| --------------- | ----------------------------------------------------------- |
| none            | a plain text greeting                                       |
| elicitation     | a host-rendered form asking who to greet                    |
| MCP Apps        | the interactive `hello` view, plus an app-only refresh tool |

`src/ui/hello/HelloView.tsx` covers the parts of the MCP Apps contract a static
document cannot: React state, a `tools/call` round trip from inside the iframe,
and re-rendering from the result the host pushes back.

## What the elicitation example demonstrates

`src/tools/elicitation.ts` is form collection on its own, with no view. It has no
MCP App variant on purpose: precedence is app, then elicitation, then baseline, so
a tool offering both resolves to its view on every host worth testing against —
including the Inspector. Form-only is what keeps the form reachable in the
`pnpm mcp:inspect` loop at all.

It covers two things `example_hello_app`'s single optional string does not. First,
every field shape the spec allows: a length-bounded string, a titled single-select
(via `oneOf`, not the deprecated `enumNames`), a bounded integer, a titled
multi-select, and a boolean with a default. Second, the four ways a request can
end — the user answers, refuses, dismisses the form, or the host answers with the
wrong types — each reported as a distinct `outcome` rather than collapsed into
"no value". Declining and cancelling stay separate because a refusal should not be
retried and an abandoned dialog reasonably can be.

See [`packages/mcp/README.md`](../../packages/mcp/README.md) for the full guide to
building views, and the layout conventions this package follows.
