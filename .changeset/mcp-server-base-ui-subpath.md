---
'@transcend-io/mcp-server-base': minor
---

Add a browser-only `@transcend-io/mcp-server-base/ui` subpath exporting `useMcpApp`, the React hook a view uses to connect to its host, read the payload the tool sent, and call tools back.

The separate subpath is load-bearing rather than cosmetic: the package root reaches into `node:async_hooks`, GraphQL clients, and OAuth, none of which can run in a sandboxed iframe. Importing only from `/ui` in view code keeps that graph unreachable. React and `@modelcontextprotocol/ext-apps` are optional peer dependencies, so packages that ship no view install nothing new.
