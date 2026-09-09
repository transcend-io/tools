---
'@transcend-io/mcp-server-base': minor
---

Add two helpers for the two ways an empty list page misleads a cold-read agent.

`describeNoMatches(subject, appliedFilters)` builds the `paginationNote` for a genuinely empty
result. A bare `[]` reads like a failed lookup, so agents re-derive the answer with a second
unfiltered call, or report the zero as a tool failure. The note says the query succeeded and
names the filters that produced the zero.

`assertOffsetInRange({ subject, offset, totalCount, appliedFilters })` throws a validation error
when a caller pages past the end. That page is byte-identical to "nothing matched", so an agent
that overshoots concludes the records do not exist instead of correcting the offset. Offset zero
is left alone — an empty first page is a real no-match and belongs to `describeNoMatches`.

List tools adopt these separately; nothing changes for existing callers.
