#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────
ENTRY="src/index.ts"
OUT_DIR="dist"
NAME="standup"
VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')

TARGETS=(
  "bun-darwin-arm64"    # macOS Apple Silicon
  "bun-darwin-x64"      # macOS Intel
  "bun-linux-arm64"     # Linux ARM64
  "bun-linux-x64"       # Linux x86_64
  "bun-windows-x64"     # Windows x86_64
)

# ─── Colors ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()  { printf "${CYAN}${BOLD}▸${NC} %s\n" "$1"; }
ok()    { printf "${GREEN}${BOLD}✓${NC} %s\n" "$1"; }
fail()  { printf "${RED}${BOLD}✗${NC} %s\n" "$1"; }

# ─── Parse args ───────────────────────────────────────────────────────
# Usage: ./build.sh              → build all targets
#        ./build.sh current      → build for current machine only
#        ./build.sh darwin-arm64 → build single target
BUILD_TARGETS=("${TARGETS[@]}")

if [ $# -gt 0 ]; then
  case "$1" in
    current)
      OS=$(uname -s | tr '[:upper:]' '[:lower:]')
      ARCH=$(uname -m)
      [ "$ARCH" = "aarch64" ] && ARCH="arm64"
      [ "$ARCH" = "x86_64" ] && ARCH="x64"
      [ "$OS" = "darwin" ] || [ "$OS" = "linux" ] || { fail "Unsupported OS: $OS"; exit 1; }
      BUILD_TARGETS=("bun-${OS}-${ARCH}")
      ;;
    *)
      BUILD_TARGETS=("bun-$1")
      ;;
  esac
fi

# ─── Clean ────────────────────────────────────────────────────────────
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

info "Building standup v${VERSION}"
echo ""

# ─── Build each target ───────────────────────────────────────────────
BUILT=0
FAILED=0

for target in "${BUILD_TARGETS[@]}"; do
  # Extract os-arch from "bun-os-arch"
  platform="${target#bun-}"

  # Output filename
  outfile="${OUT_DIR}/${NAME}-${platform}"
  [ "$platform" = "windows-x64" ] && outfile="${outfile}.exe"

  printf "  ${DIM}Building ${NC}${BOLD}%-20s${NC} " "$platform"

  if bun build --compile --target="$target" --outfile="$outfile" "$ENTRY" 2>/dev/null; then
    size=$(du -h "$outfile" | cut -f1 | xargs)
    printf "${GREEN}✓${NC} ${DIM}%s${NC}\n" "$size"
    BUILT=$((BUILT + 1))
  else
    printf "${RED}✗ failed${NC}\n"
    FAILED=$((FAILED + 1))
  fi
done

echo ""

# ─── Summary ──────────────────────────────────────────────────────────
if [ "$FAILED" -eq 0 ]; then
  ok "Built ${BUILT} binaries → ./${OUT_DIR}/"
else
  warn "${BUILT} built, ${FAILED} failed → ./${OUT_DIR}/"
fi

echo ""
ls -lh "$OUT_DIR"/
echo ""
