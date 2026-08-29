---
'@transcend-io/mcp-server-docs': minor
'@transcend-io/mcp': minor
---

Rename the `docs_list` search argument from `keyword` to `query`, and tighten BM25 matching.

`query` is what comparable search tools name this argument — Linear, Notion, and Datadog all use
it — so the rename stops `docs_list` from being the one search tool in a caller's toolset that
differs from the convention.

Search now uses `tolerance: 0` and `threshold: 0.3`. Fuzzy matching cost accuracy on every set
of a labeled benchmark, and a typo it "rescued" returned unrelated articles rather than the
intended one. The threshold change leaves recall unchanged while cutting matches on a typical
query from roughly 417 to 131, so the reported `totalCount` is a usable signal rather than
close to the size of the corpus.

The argument description now asks for the most distinctive terms rather than a whole sentence,
since generic words match most articles and blur the ranking.

Search returns 20 results rather than 10. On the same benchmark, targets that missed the top ten
sat at a median rank of 16 and 19, so one page deeper lifts hit@k from 87% to 95% on title terms
and 88% to 95% on natural questions, for roughly 434 extra tokens. There is deliberately no
offset: almost nothing recoverable ranks past 30, and paging only helps a caller that knows it
missed — at rank 16 the first ten results all look plausible, so the miss goes unnoticed and the
page is never requested.

`docs_list` also no longer answers an argument-less call with the whole catalog. It returns the
seven documentation sections with their article counts — 540 characters against the roughly 69KB
the full listing cost — which is a better answer to "what is documented" and makes the next call
obvious. Listing a single section is capped at 50 articles, since the largest holds 125. Whenever
results are withheld, the response now carries a note saying how many and what to change; a
truncated response the caller cannot distinguish from a complete one is what made the previous
behavior hard to notice. An unrecognized `section` is now an error naming the valid ones instead
of an empty list that reads like "no such articles", and a `query` that is present but blank is
an error rather than a silent fall-through to browsing — the caller asked to search, so answering
with the section list and reporting success hides the fact that no search ran.
