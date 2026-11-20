---
"@transcend-io/mcp-server-docs": minor
"@transcend-io/mcp": patch
---

Add signed-in `docs_integration_lookup`, which reads one integration's catalog connection docs by name or title and lists close names on a miss. Extend `docs_list` with an `integration` filter for public guides. The standalone docs server now builds a catalog-capable GraphQL client, so the tool works there as well as in the umbrella server.
