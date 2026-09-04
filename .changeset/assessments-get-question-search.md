---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
---

Find the questions on a topic with `assessments_get`, without guessing which section holds them.

`assessments_get` answers "what does this form ask" by returning a section list, then expanding
the sections a caller names. That works when the section titles say where to look, and fails
when they do not: asked whether a form covers data retention, an agent had to read section
titles, guess, expand, and repeat — the over-fetching the section list exists to prevent. It is
not a hypothetical failure either. One form in staging has a section titled "Data Storage and
Security" whose questions are all about legal basis and compliance, so the title actively
misleads.

`questionText` returns only the questions whose text matches, with their answers and the
section each one sits in. On that form, "retention" comes back as a single question in one
call. Passing `sectionIds` alongside searches within those sections rather than expanding them.

A question does not reference its section, and `assessmentQuestions` filters by section id with
no form filter, so one skeleton read does double duty: it supplies the section ids to scope the
search to, and the question ids that place each match on the form. Matches are drained rather
than paged, since they cannot outnumber the questions on the form, and a caller asking whether
a form covers a topic should not have to page to find out.

An empty result is reported as an answer — the form does not ask about this — phrased so it
cannot be read as a failed lookup, and saying that the search covers question text rather than
answers. Searching answers is not possible: the API has no field for it. `assessmentQuestions`
and `assessmentForms` both match titles only, and `assessmentQuestionSelectOptions` resolves
dashboard dropdown options rather than submitted answers.
