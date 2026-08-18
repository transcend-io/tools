---
'@transcend-io/mcp-server-preferences': minor
'@transcend-io/mcp-server-dsr': minor
'@transcend-io/mcp': minor
---

Require human confirmation before the highest-consequence tools run. `dsr_cancel`, `dsr_submit`, `dsr_submit_on_behalf`, `dsr_enrich_identifiers`, `preferences_delete`, `preferences_delete_identifiers` and `preferences_update_identifiers` now declare `confirmation`, so a person is asked before the handler runs and the call refuses if nobody can be.

`dsr_submit`, `dsr_submit_on_behalf`, `dsr_enrich_identifiers` and `preferences_update_identifiers` also flip to `destructiveHint: true`. Gating a tool and annotating it non-destructive tells hosts two different things about the same call, so the gate requires the annotation to agree. All four earn it: submitting an ERASURE or opt-out request starts irreversible deletion across connected systems, and both identifier tools overwrite values that determine whose data a request or consent record resolves to.

Five of the seven are `requireSombra` and so were already omitted from Agentic Assist. The two that are not, `dsr_cancel` and `dsr_submit_on_behalf`, are the only ones this newly puts behind a confirmation for HTTP callers.
