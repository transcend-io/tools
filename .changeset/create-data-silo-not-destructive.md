---
'@transcend-io/mcp-server-inventory': patch
'@transcend-io/mcp': patch
---

`inventory_create_data_silo` now annotates `destructiveHint: false`. It adds a data-map entry and touches nothing existing, which is what the MCP spec calls an additive update; the previous `true` read as "this writes" rather than "this destroys". The neighbouring `inventory_update_data_silo` — which does overwrite existing metadata — was already `false`, so the pair had the asymmetry backwards.

Hosts use `destructiveHint` to decide how loudly to warn before a call, so labelling a harmless create as destructive trains people to click through warnings and cheapens them on the tools that need them.
