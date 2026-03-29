#!/usr/bin/env bash
set -euo pipefail

# ─── E2E Test: parquet-to-csv ───────────────────────────────────────
# Builds utils + CLI, generates test parquet files, converts, verifies.
# Requires: DuckDB CLI or @duckdb/node-api (used by the worker)
# Run from repo root: bash packages/cli/scripts/e2e-test-parquet-to-csv.sh

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CLI_DIR="$REPO_ROOT/packages/cli"
TMP="/tmp/e2e-parquet-csv-$$"
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

# ── Step 2: Verify worker entry points exist ─────────────────────────
check "parquet-to-csv/worker.mjs exists in dist" \
  "test -f '$CLI_DIR/dist/commands/admin/parquet-to-csv/worker.mjs'"

# ── Step 3: Generate test parquet files ──────────────────────────────
info "Generating test parquet files in $TMP..."
mkdir -p "$TMP/input" "$TMP/output"

# Use Python + pyarrow to generate parquet (widely available)
python3 -c "
import sys
try:
    import pyarrow as pa
    import pyarrow.parquet as pq
except ImportError:
    print('SKIP: pyarrow not installed. Install with: pip3 install pyarrow')
    sys.exit(42)

# File 1: 10K rows
table1 = pa.table({'id': range(10000), 'name': [f'user{i}' for i in range(10000)]})
pq.write_table(table1, '$TMP/input/small.parquet')

# File 2: 50K rows
table2 = pa.table({
    'id': range(50000),
    'email': [f'user{i}@test.com' for i in range(50000)],
    'value': [i * 0.01 for i in range(50000)],
})
pq.write_table(table2, '$TMP/input/medium.parquet')

print('Generated 2 parquet files')
" 2>&1
PYARROW_EXIT=$?

if [ "$PYARROW_EXIT" -eq 42 ]; then
  echo ""
  red "SKIPPED: pyarrow not available. Install with: pip3 install pyarrow"
  echo "═══════════════════════════════════════════"
  printf "  Results: \033[33mSKIPPED\033[0m (pyarrow not installed)\n"
  echo "═══════════════════════════════════════════"
  exit 0
fi

INPUT_FILES=$(ls "$TMP/input/"*.parquet 2>/dev/null | wc -l | tr -d ' ')
check "2 parquet files created" "[ '$INPUT_FILES' = '2' ]"
ls -lh "$TMP/input/"

# ── Step 4: Run parquet-to-csv ───────────────────────────────────────
info "Running parquet-to-csv with concurrency=2, viewerMode=true..."
(cd "$CLI_DIR" && pnpm start admin parquet-to-csv \
  --directory="$TMP/input" \
  --outputDir="$TMP/output" \
  --concurrency=2 \
  --viewerMode=true 2>&1) || true

echo ""
info "Output files:"
ls -lh "$TMP/output/"

# ── Step 5: Verify output ────────────────────────────────────────────
OUTPUT_FILES=$(ls "$TMP/output/"*.csv 2>/dev/null | wc -l | tr -d ' ')
check "Output has CSV files" "[ '$OUTPUT_FILES' -gt '0' ]"
check "One CSV per parquet file" "[ '$OUTPUT_FILES' = '2' ]"

# Count rows
TOTAL_ROWS=0
for f in "$TMP/output/"*.csv; do
  ROWS=$(tail -n +2 "$f" | grep -c . || true)
  TOTAL_ROWS=$((TOTAL_ROWS + ROWS))
done
EXPECTED_ROWS=$((10000 + 50000))
info "Total output rows: $TOTAL_ROWS (expected: $EXPECTED_ROWS)"
check "Total rows match input ($EXPECTED_ROWS)" "[ '$TOTAL_ROWS' = '$EXPECTED_ROWS' ]"

# ── Step 6: Verify log files ────────────────────────────────────────
LOG_DIR="$TMP/input/logs"
check "Log directory exists" "test -d '$LOG_DIR'"
check "worker-0.log exists" "test -f '$LOG_DIR/worker-0.log'"
check "worker-1.log exists (2nd worker)" "test -f '$LOG_DIR/worker-1.log'"

# Check for CHILD_FLAG errors
ERR_CONTENT=$(cat "$LOG_DIR"/worker-*.err.log 2>/dev/null || true)
if echo "$ERR_CONTENT" | grep -q "No command registered"; then
  red "Worker stderr contains 'No command registered' — CHILD_FLAG bug!"
  FAIL=$((FAIL + 1))
else
  green "No 'No command registered' errors in worker stderr"
  PASS=$((PASS + 1))
fi

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
printf "  Results: \033[32m%d passed\033[0m, \033[31m%d failed\033[0m\n" "$PASS" "$FAIL"
echo "═══════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
