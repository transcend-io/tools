#!/usr/bin/env bash
set -euo pipefail

# ─── E2E Test: upload-preferences ───────────────────────────────────
# Tests the preference upload command with real API calls.
# Requires environment variables:
#   TRANSCEND_API_KEY - API key for Transcend
#   PARTITION         - Preference store partition UUID
#   SOMBRA_AUTH       - (optional) Sombra API key
#   TRANSCEND_URL     - (optional) defaults to https://api.transcend.io
#
# Run from repo root:
#   TRANSCEND_API_KEY=xxx PARTITION=uuid bash packages/cli/scripts/e2e-test-upload-preferences.sh

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CLI_DIR="$REPO_ROOT/packages/cli"
TMP="/tmp/e2e-upload-prefs-$$"
PASS=0
FAIL=0

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red()   { printf "\033[31m✗ %s\033[0m\n" "$1"; }
info()  { printf "\033[36m→ %s\033[0m\n" "$1"; }
warn()  { printf "\033[33m⚠ %s\033[0m\n" "$1"; }
check() {
  if eval "$2"; then
    green "$1"; PASS=$((PASS + 1))
  else
    red "$1"; FAIL=$((FAIL + 1))
  fi
}

# ── Preflight: check required env vars ───────────────────────────────
if [ -z "${TRANSCEND_API_KEY:-}" ]; then
  red "TRANSCEND_API_KEY is required"
  echo "Usage: TRANSCEND_API_KEY=xxx PARTITION=uuid bash $0"
  exit 1
fi
if [ -z "${PARTITION:-}" ]; then
  red "PARTITION is required (preference store partition UUID)"
  echo "Usage: TRANSCEND_API_KEY=xxx PARTITION=uuid bash $0"
  exit 1
fi

TRANSCEND_URL="${TRANSCEND_URL:-https://api.transcend.io}"
info "Using Transcend URL: $TRANSCEND_URL"
info "Using partition: $PARTITION"

# ── Step 1: Build ────────────────────────────────────────────────────
info "Building @transcend-io/utils..."
(cd "$REPO_ROOT/packages/utils" && pnpm run build --silent)
info "Building @transcend-io/sdk..."
(cd "$REPO_ROOT/packages/sdk" && pnpm run build --silent)
info "Building @transcend-io/cli..."
(cd "$CLI_DIR" && pnpm run build --silent)
green "Build complete"

# ── Step 2: Generate test CSV + column-mapping config ────────────────
# Uses two identifiers (email + phone) to exercise multi-identifier uploads.
info "Generating test preference CSV in $TMP..."
mkdir -p "$TMP/input"

cat > "$TMP/input/test-preferences.csv" << 'CSV'
email,phone,Marketing,timestamp
test-e2e-1@transcend-test.com,+15555550101,true,2025-01-01T00:00:00.000Z
test-e2e-2@transcend-test.com,+15555550102,false,2025-01-01T00:00:00.000Z
test-e2e-3@transcend-test.com,+15555550103,true,2025-01-02T00:00:00.000Z
CSV

cat > "$TMP/preference-upload-schema.json" << 'JSON'
{
  "columnToPurposeName": {
    "Marketing": {
      "purpose": "Marketing",
      "preference": null,
      "valueMapping": { "true": true, "false": false }
    }
  },
  "lastFetchedAt": "2025-01-01T00:00:00.000Z",
  "columnToIdentifier": {
    "email": { "name": "email", "isUniqueOnPreferenceStore": true },
    "phone": { "name": "phone", "isUniqueOnPreferenceStore": false }
  },
  "timestampColumn": "timestamp"
}
JSON

info "Test CSV contents:"
cat "$TMP/input/test-preferences.csv"
echo ""

UPLOAD_ARGS=(
  consent upload-preferences
  --auth="$TRANSCEND_API_KEY"
  --directory="$TMP/input"
  --schemaFilePath="$TMP/preference-upload-schema.json"
  --receiptFileDir="$TMP/receipts"
  --partition="$PARTITION"
  --skipConflictUpdates=true
  --viewerMode=true
  --transcendUrl="$TRANSCEND_URL"
)
if [ -n "${SOMBRA_AUTH:-}" ]; then
  UPLOAD_ARGS+=(--sombraAuth="$SOMBRA_AUTH")
fi

# ── Step 3: Dry run (no actual upload) ───────────────────────────────
info "Running upload-preferences with --dryRun=true..."
DRY_RUN_OUTPUT=$(cd "$CLI_DIR" && pnpm start "${UPLOAD_ARGS[@]}" --dryRun=true 2>&1) || true

echo "$DRY_RUN_OUTPUT" | tail -10
echo ""

check "Dry run completed without crash" \
  "echo '$DRY_RUN_OUTPUT' | grep -q 'All done. Pending:'"

# ── Step 4: Real upload (small batch) ────────────────────────────────
info "Running upload-preferences for real (3 records)..."
warn "This will upload test preference records to partition $PARTITION"
read -p "Continue? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  info "Skipped real upload (user declined)"
else
  UPLOAD_OUTPUT=$(cd "$CLI_DIR" && pnpm start "${UPLOAD_ARGS[@]}" --isSilent=true 2>&1) || true

  echo "$UPLOAD_OUTPUT" | tail -10
  echo ""

  check "Upload completed" \
    "echo '$UPLOAD_OUTPUT' | grep -q 'All done. Success:'"

  # Re-running the same file should skip records that are already up to date
  info "Re-running upload-preferences on the same file..."
  RERUN_OUTPUT=$(cd "$CLI_DIR" && pnpm start "${UPLOAD_ARGS[@]}" --isSilent=true 2>&1) || true

  echo "$RERUN_OUTPUT" | tail -5
  echo ""

  check "Re-run skips already uploaded records" \
    "echo '$RERUN_OUTPUT' | grep -q 'Skipped:[1-9]'"
fi

# ── Step 5: Pull preferences back (verify round-trip) ────────────────
info "Pulling preferences back from partition $PARTITION..."
PULL_OUTPUT=$(cd "$CLI_DIR" && pnpm start consent pull-consent-preferences \
  --auth="$TRANSCEND_API_KEY" \
  --partition="$PARTITION" \
  --file="$TMP/pulled-preferences.csv" \
  ${SOMBRA_AUTH:+--sombraAuth="$SOMBRA_AUTH"} \
  --transcendUrl="$TRANSCEND_URL" 2>&1) || true

echo "$PULL_OUTPUT" | tail -5
echo ""

if [ -f "$TMP/pulled-preferences.csv" ]; then
  PULLED_ROWS=$(tail -n +2 "$TMP/pulled-preferences.csv" | grep -c . || true)
  info "Pulled $PULLED_ROWS preference records"
  check "Pulled CSV has records" "[ '$PULLED_ROWS' -gt '0' ]"
else
  red "No pulled CSV file created"
  FAIL=$((FAIL + 1))
fi

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
printf "  Results: \033[32m%d passed\033[0m, \033[31m%d failed\033[0m\n" "$PASS" "$FAIL"
echo "═══════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
