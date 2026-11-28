---
'@transcend-io/cli': major
---

**Breaking:** `transcend inventory push` and legacy `tr-push` now compare your file with your organization, print what would change, and ask you to confirm before writing anything. Non-interactive runs without `--yes` exit before any writes.

**Migrating `@transcend-io/cli`**

1. **CI, GitHub Actions, and scripts without a terminal** — pass `--yes` to apply after the preview:

   ```sh
   transcend inventory push --auth="$TRANSCEND_API_KEY" --yes
   ```

   Update GitHub Actions from:

   ```yaml
   run: transcend inventory push --auth=${{ secrets.TRANSCEND_API_KEY }}
   ```

   to:

   ```yaml
   run: transcend inventory push --auth=${{ secrets.TRANSCEND_API_KEY }} --yes
   ```

2. **Skip the preview** and push immediately (behavior before this release):

   ```sh
   transcend inventory push --auth="$TRANSCEND_API_KEY" --skipPreview
   ```

3. **Preview only** — `--dryRun` still lists planned changes and writes nothing. Do not use `--dryRun` with `--skipPreview`.

4. **No changes in the preview** — the command does not prompt and does not push. Pass `--skipPreview` to push without comparing.

5. **Multiple organizations** (JSON auth file) — previews run for each organization, then you confirm once. Any preview error aborts the entire push.