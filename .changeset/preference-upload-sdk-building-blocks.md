---
'@transcend-io/sdk': minor
'@transcend-io/cli': patch
---

Add preference upload helpers to the SDK. `uploadChunkWithSplit` uploads preference batches with retries and split fallback. `buildPendingUpdates` turns mapped CSV rows into Preference Store updates. The `PreferenceUploadProgress` type and `NONE_PREFERENCE_MAP` constant are now exported too.
