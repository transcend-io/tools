---
'@transcend-io/sdk': minor
---

Add preference upload types and helpers to SDK

- Add FileFormatState codec (schema-only CSV column mapping without upload receipts)
- Add RequestUploadReceipts codec (tracks upload progress and results)
- Add loadReferenceData helper (fetches purposes, topics, identifiers in parallel)
- Add getPreferenceIdentifiersFromRow helper (extracts identifiers from a CSV row)
- Add getUniquePreferenceIdentifierNamesFromRow helper (extracts unique identifiers from a CSV row)
