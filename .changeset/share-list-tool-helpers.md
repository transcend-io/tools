---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
---

Move the list-filter helpers into `mcp-server-base` so every list tool answers the same way.

`assessments_list` had grown its own copy of three pieces every list tool needs: an optional
array filter that rejects `[]`, an ISO 8601 date bound, and the `paginationNote` builder. One
copy per package is where wording starts drifting, and the wording is the whole point — these
exist so an agent can tell "nothing matched" from "your filter is broken", and "this page is
full" from "this is everything".

`mcp-server-base` now exports `nonEmptyList`, `nonEmptyListMessage`, `isoDate` and
`describeOutcome`. The local definitions are deleted rather than re-exported.

`nonEmptyList` takes an optional subject, so the message can name the element
(`Pass at least one template ID, or omit the filter entirely.`) instead of saying `value`.
`nonEmptyListMessage` is exported on its own for arrays whose elements are enums rather than
strings, which cannot use the schema builder but should still fail in the same words. It is
named `nonEmptyList` rather than `idList` because callers apply it to country codes, emails,
titles and integration types, none of which are IDs.

`assessments_list_groups` and `assessments_list_templates` gain behavior along the way. Both
previously only explained an empty page; they now report progress on a full one too, so a
caller paging a few hundred rows is told the next offset instead of deriving it. That was the
gap behind agents stopping early and reporting one page as the whole answer.

`describeOutcome` takes the plural `subject` as an argument, since the version it replaces had
`assessments` hardcoded, and it tolerates an absent `offset` or `limit` for the same reason
`assertOffsetInRange` does: schemas default them, but handlers are called directly too.
