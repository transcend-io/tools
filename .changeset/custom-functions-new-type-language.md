---
'@transcend-io/cli': patch
---

Say which Custom Function type each `custom-functions new` template produces.

The command described its templates by the code they emit ("General or DSR starter", "Generated
handler and fixture shape"), which does not map onto the two product concepts a caller is choosing
between: a General function triggered by Rules Automation, and a DSR function. The template prompt,
flag brief, command description, and README now name the type first, and spell out that
`dsr-datapoint` is a data point resolver, `dsr-enricher` is a preflight check (the flag keeps the
API's export name), and `dsr-both` supports both.

The scaffolded DSR enricher comments and the skill's CI recipe follow the same wording, and that
recipe now pins Deno 2.4.5 to match the version this repository validates against.
