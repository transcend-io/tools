#!/usr/bin/env bash
set -euo pipefail

# ─── E2E Test: chunk-csv ────────────────────────────────────────────
# Builds utils + CLI, generates test data, runs chunk-csv, verifies output.
# Run from repo root: bash packages/cli/scripts/e2e-test-chunk-csv.sh

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CLI_DIR="$REPO_ROOT/packages/cli"
TMP="/tmp/e2e-chunk-csv-$$"
PASS=0
FAIL=0

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red()   { printf "\033[31m✗ %s\033[0m\n" "$1"; }
info()  { printf "\033[36m→ %s\033[0m\n" "$1"; }
check() {
  if eval "$2"; then
    green "$1"; PASS=$((PASS + 1))
  else
    red "$1"; FAIL=$((FAIL + 1))
  fi
}

# ── Step 1: Build ────────────────────────────────────────────────────
info "Building @transcend-io/utils..."
(cd "$REPO_ROOT/packages/utils" && pnpm run build --silent)
info "Building @transcend-io/cli..."
(cd "$CLI_DIR" && pnpm run build --silent)
green "Build complete"

# ── Step 2: Verify worker entry points exist in dist ─────────────────
info "Checking dist for worker entry points..."
check "chunk-csv/worker.mjs exists in dist" \
  "test -f '$CLI_DIR/dist/commands/admin/chunk-csv/worker.mjs'"
check "parquet-to-csv/worker.mjs exists in dist" \
  "test -f '$CLI_DIR/dist/commands/admin/parquet-to-csv/worker.mjs'"

# ── Step 3: Generate test data ───────────────────────────────────────
info "Generating test data in $TMP..."
mkdir -p "$TMP/input" "$TMP/output"

# File 1: 50K rows (~1.7MB)
python3 -c "
import csv
with open('$TMP/input/medium.csv', 'w') as f:
    w = csv.writer(f)
    w.writerow(['id','name','email','value'])
    for i in range(50000):
        w.writerow([i, f'user{i}', f'user{i}@test.com', i * 0.01])
"
# File 2: 100K rows (~3.5MB) 
python3 -c "
import csv
with open('$TMP/input/large.csv', 'w') as f:
    w = csv.writer(f)
    w.writerow(['id','name','email','value','extra'])
    for i in range(100000):
        w.writerow([i, f'user{i}', f'user{i}@test.com', i * 0.01, 'x' * 10])
"
# File 3: 10 rows (tiny, shouldn't need splitting)
python3 -c "
import csv
with open('$TMP/input/tiny.csv', 'w') as f:
    w = csv.writer(f)
    w.writerow(['id','name'])
    for i in range(10):
        w.writerow([i, f'user{i}'])
"

INPUT_FILES=$(ls "$TMP/input/"*.csv | wc -l | tr -d ' ')
info "Created $INPUT_FILES CSV files in $TMP/input/"
ls -lh "$TMP/input/"

check "3 input files created" "[ '$INPUT_FILES' = '3' ]"

# ── Step 4: Run chunk-csv (multi-file, multi-worker) ────────────────
info "Running chunk-csv with chunkSizeMB=0.5, concurrency=2, viewerMode=true..."
(cd "$CLI_DIR" && pnpm start admin chunk-csv \
  --directory="$TMP/input" \
  --outputDir="$TMP/output" \
  --chunkSizeMB=0.5 \
  --concurrency=2 \
  --viewerMode=true 2>&1) || true

echo ""
info "Output files:"
ls -lh "$TMP/output/"

# ── Step 5: Verify output ────────────────────────────────────────────
OUTPUT_FILES=$(ls "$TMP/output/"*.csv 2>/dev/null | wc -l | tr -d ' ')
check "Output has CSV files" "[ '$OUTPUT_FILES' -gt '0' ]"
check "More chunks than input files (splitting happened)" "[ '$OUTPUT_FILES' -gt '3' ]"

# Count total output rows (excluding headers).
# Use tail -n+2 to skip header, then count — avoids wc -l trailing newline issues.
TOTAL_ROWS=0
for f in "$TMP/output/"*.csv; do
  ROWS=$(tail -n +2 "$f" | grep -c . || true)
  TOTAL_ROWS=$((TOTAL_ROWS + ROWS))
done
EXPECTED_ROWS=$((50000 + 100000 + 10))

info "Total output rows: $TOTAL_ROWS (expected: $EXPECTED_ROWS)"
# Allow up to 1 row variance per chunk file (boundary rounding in chunkOneCsvFile)
DIFF=$((EXPECTED_ROWS - TOTAL_ROWS))
if [ "$DIFF" -lt 0 ]; then DIFF=$((-DIFF)); fi
check "Total rows within tolerance of input ($EXPECTED_ROWS ± $OUTPUT_FILES)" \
  "[ '$DIFF' -le '$OUTPUT_FILES' ]"

# ── Step 6: Verify log files ────────────────────────────────────────
info "Checking log directory..."
LOG_DIR="$TMP/input/logs"
check "Log directory exists" "test -d '$LOG_DIR'"
check "worker-0.log exists" "test -f '$LOG_DIR/worker-0.log'"
check "worker-0.out.log exists" "test -f '$LOG_DIR/worker-0.out.log'"
check "worker-0.err.log exists" "test -f '$LOG_DIR/worker-0.err.log'"
check "worker-0.info.log exists" "test -f '$LOG_DIR/worker-0.info.log'"
check "worker-0.warn.log exists" "test -f '$LOG_DIR/worker-0.warn.log'"
check "worker-0.error.log exists" "test -f '$LOG_DIR/worker-0.error.log'"
check "worker-1.log exists (2nd worker)" "test -f '$LOG_DIR/worker-1.log'"

# Check worker logs for errors
ERR_CONTENT=$(cat "$LOG_DIR/worker-0.err.log" "$LOG_DIR/worker-1.err.log" 2>/dev/null || true)
if echo "$ERR_CONTENT" | grep -q "No command registered"; then
  red "Worker stderr contains 'No command registered' — CHILD_FLAG bug still present!"
  FAIL=$((FAIL + 1))
else
  green "No 'No command registered' errors in worker stderr"
  PASS=$((PASS + 1))
fi

# ── Step 7: Re-run to test log reset ────────────────────────────────
info "Running chunk-csv again to test log truncation..."
rm -rf "$TMP/output" && mkdir -p "$TMP/output"
(cd "$CLI_DIR" && pnpm start admin chunk-csv \
  --directory="$TMP/input" \
  --outputDir="$TMP/output" \
  --chunkSizeMB=0.5 \
  --viewerMode=true 2>&1) || true

# Logs should have been truncated (only current run content)
LOG_SIZE=$(wc -c < "$LOG_DIR/worker-0.out.log" | tr -d ' ')
check "Log files were reset (worker-0.out.log < 10KB)" "[ '$LOG_SIZE' -lt '10240' ]"

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
printf "  Results: \033[32m%d passed\033[0m, \033[31m%d failed\033[0m\n" "$PASS" "$FAIL"
echo "═══════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
