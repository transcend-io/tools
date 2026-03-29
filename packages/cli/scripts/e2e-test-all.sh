#!/usr/bin/env bash
set -euo pipefail

# ─── E2E Test Runner ────────────────────────────────────────────────
# Runs all E2E tests for CLI commands that use pooling.
# Run from repo root: bash packages/cli/scripts/e2e-test-all.sh
#
# For upload-preferences (requires API keys):
#   TRANSCEND_API_KEY=xxx PARTITION=uuid bash packages/cli/scripts/e2e-test-all.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0

echo "╔═══════════════════════════════════════════╗"
echo "║       CLI E2E Test Suite                  ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ── Test 1: chunk-csv ────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1/3  chunk-csv"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if bash "$SCRIPT_DIR/e2e-test-chunk-csv.sh"; then
  TOTAL_PASS=$((TOTAL_PASS + 1))
else
  TOTAL_FAIL=$((TOTAL_FAIL + 1))
fi
echo ""

# ── Test 2: parquet-to-csv ───────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  2/3  parquet-to-csv"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if bash "$SCRIPT_DIR/e2e-test-parquet-to-csv.sh"; then
  TOTAL_PASS=$((TOTAL_PASS + 1))
else
  # Check if skipped (pyarrow not installed)
  if bash "$SCRIPT_DIR/e2e-test-parquet-to-csv.sh" 2>&1 | grep -q "SKIPPED"; then
    TOTAL_SKIP=$((TOTAL_SKIP + 1))
  else
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
fi
echo ""

# ── Test 3: upload-preferences ───────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  3/3  upload-preferences"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -z "${TRANSCEND_API_KEY:-}" ] || [ -z "${PARTITION:-}" ]; then
  printf "\033[33m⚠ SKIPPED: set TRANSCEND_API_KEY and PARTITION to run\033[0m\n"
  TOTAL_SKIP=$((TOTAL_SKIP + 1))
else
  if bash "$SCRIPT_DIR/e2e-test-upload-preferences.sh"; then
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
fi
echo ""

# ── Final Summary ────────────────────────────────────────────────────
echo "╔═══════════════════════════════════════════╗"
printf "║  \033[32m%d passed\033[0m  \033[31m%d failed\033[0m  \033[33m%d skipped\033[0m        ║\n" \
  "$TOTAL_PASS" "$TOTAL_FAIL" "$TOTAL_SKIP"
echo "╚═══════════════════════════════════════════╝"

[ "$TOTAL_FAIL" -eq 0 ] && exit 0 || exit 1
