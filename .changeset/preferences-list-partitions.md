---
'@transcend-io/mcp-server-preferences': minor
---

Add `preferences_list_partitions` so agents can discover Preference Store partition keys (default airgap bundle + custom) via GraphQL before calling Sombra preferences tools. Require `ViewConsentManager` and point sibling `partition` field descriptions at the new discovery tool.
