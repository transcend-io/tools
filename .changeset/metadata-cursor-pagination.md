---
'@transcend-io/sdk': patch
---

Switch request identifier metadata fetching to cursor-based pagination and raise the page size, reducing the number of GraphQL round-trips for large requests.
