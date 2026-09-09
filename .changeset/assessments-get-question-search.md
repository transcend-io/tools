---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
---

Add `questionText` to `assessments_get`, so finding what a form asks does not mean guessing
which section holds it.

Reading a form meant naming sections and trusting their titles. One staging form has a section
titled "Data Storage and Security" whose questions are all legal basis and compliance, so the
guess-expand-repeat loop is the over-fetching the section list exists to prevent.

`questionText` returns only the questions whose text matches, with their answers and the
section each sits in. Pass `sectionIds` alongside it to search within those sections rather
than expanding them. Matches are drained rather than paged, since they cannot outnumber the
form's questions.

Answers cannot be searched — the API matches question and form titles only — and an empty
result says so, phrased as an answer rather than a failed lookup.
