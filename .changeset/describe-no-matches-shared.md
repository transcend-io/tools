---
'@transcend-io/mcp-server-base': minor
---

Export `describeNoMatches`, so any server can say why a list came back empty.

An empty `data` array reads exactly like a failed lookup. Cold-read agents that hit one spend
a second, unfiltered call re-deriving the answer by hand before they will trust the zero, or
report the emptiness as a tool failure. The helper builds the `paginationNote` that says the
query succeeded and which filters were applied, and distinguishes that from an organization
that simply has none of the thing.

It sits next to `createListResult`, whose `paginationNote` option consumes it. Only the
assessment list tools use it so far; every other paginated tool in the monorepo still returns
a bare empty page.
