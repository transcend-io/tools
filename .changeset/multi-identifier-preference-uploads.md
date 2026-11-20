---
'@transcend-io/cli': major
'@transcend-io/sdk': major
---

`transcend consent upload-preferences` now supports CSVs with multiple identifiers per row (for example email and phone). It uploads files in parallel worker processes with a live dashboard, and splits files larger than `--chunkSizeMB` (default 11MB) automatically.

Column mapping now lives in a new `transcend consent configure-preference-upload` command. It scans every CSV in the directory, walks you through mapping identifiers, timestamp, purposes, preferences, and metadata, then saves a reusable config file.

**Migrating `@transcend-io/cli`**

1. Replace `--file=./prefs.csv` with `--directory=./prefs`. Put your CSV in its own folder if needed.
2. Run `transcend consent configure-preference-upload --directory=./prefs` once before uploading, or pass `--regenerate` to `upload-preferences`. The upload exits with an error when no config file exists.
3. Add the **View Request Identity Settings** scope to the API key.
4. Remove `--receiptFilepath`. Receipts are written per file to `--receiptFileDir`, which now defaults to `<directory>/../receipts` instead of `./receipts`.
5. `--concurrency` now sets the number of worker processes and defaults to your CPU count (it was files at once, default 10). Use the new `--uploadConcurrency` (default 25) to tune requests per process.
6. Receipt files from v13 cannot be resumed. Start the upload fresh. Rows that already match the Preference Store are skipped.

**Migrating `@transcend-io/sdk`**

- `getPreferencesForIdentifiers` now requires a `name` on each identifier (for example `{ value: 'a@example.com', name: 'email' }`). `onProgress` now receives `{ successDelta, successTotal, fileTotal }` instead of `(completed, total)`.
- `FileMetadataState` and `PreferenceState` are removed. Use `FileFormatState` for column mappings and `RequestUploadReceipts` for upload receipts.
