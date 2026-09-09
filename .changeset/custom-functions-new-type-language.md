---
'@transcend-io/cli': patch
---

Say which Custom Function type each `custom-functions new` template produces.

The command described its templates by the code they emit ("General or DSR starter", "Generated
handler and fixture shape"), which does not map onto the two product concepts a caller is choosing
between: a General function triggered by Rules Automation, and a DSR function triggered by a
Workflow step. The interactive flow now asks for that type first, using
`CustomFunctionType` from `@transcend-io/privacy-types` rather than a parallel local union.
General continues immediately because it has only one template; DSR opens a second prompt for a
data point resolver, preflight check, or both. The flag brief, command description, and README
use the same language.

The scaffolded DSR enricher comments and the skill's CI recipe follow the same wording, and that
recipe now pins Deno 2.4.5 to match the version this repository validates against.
