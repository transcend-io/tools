---
"@transcend-io/mcp-server-dsr": minor
"@transcend-io/mcp-server-base": patch
"@transcend-io/mcp": patch
---

Expose DSR request assignees and connected-system owners through MCP so Agentic Assist can answer who owns approval bottlenecks and failed systems.

`dsr_list` and `dsr_get_details` now return each request's assigned owners and teams. A new `dsr_list_request_data_silos` tool lists per-system processing status (including errors) with nested data-silo owners and teams, so bottleneck questions no longer hit a capability gap.
