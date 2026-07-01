---
'@transcend-io/cli': minor
---

Add configure-preference-upload CLI command

- New `transcend consent configure-preference-upload` command that interactively configures column mappings for preference CSV uploads
- Scans CSV files to discover headers and unique values, then walks through a 6-step wizard (identifiers, identifier names, timestamp, purpose columns, value mappings, metadata)
- Saves a reusable config JSON for fully non-interactive uploads via `upload-preferences`
- Deprecate old parsing functions that use FileMetadataState in favor of new FileFormatState versions
