#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────
REPO_OWNER="Nabwinsaud"
REPO_NAME="standup"
BIN_DIR="${HOME}/.local/bin"
BIN_PATH="${BIN_DIR}/standup"
GITHUB_API="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}"

# ─── Colors ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()  { printf "${CYAN}${BOLD}  ▸${NC} %s\n" "$1"; }
ok()    { printf "${GREEN}${BOLD}  ✓${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}${BOLD}  !${NC} %s\n" "$1"; }
fail()  { printf "${RED}${BOLD}  ✗${NC} %s\n" "$1"; exit 1; }

# ─── Progress bar ────────────────────────────────────────────────────
# Renders a progress bar from curl's -w output
progress_bar() {
  local label="$1"
  local width=40
  local pct=0
  local filled=0
  local empty=0
  local bar=""

  printf "\r${CYAN}${BOLD}  ▸${NC} %-30s [" "$label"
  printf '%0.s─' $(seq 1 $width)
  printf "]   0%%"

  while IFS= read -r line; do
    # curl progress: "  % Total    % Received ..." or just a number
    pct=$(echo "$line" | grep -oE '[0-9]+\.?[0-9]*' | tail -1 | cut -d. -f1 2>/dev/null || echo "")
    if [ -n "$pct" ] && [ "$pct" -ge 0 ] 2>/dev/null && [ "$pct" -le 100 ] 2>/dev/null; then
      filled=$((pct * width / 100))
      empty=$((width - filled))
      bar=""
      [ "$filled" -gt 0 ] && bar=$(printf '%0.s█' $(seq 1 $filled))
      [ "$empty" -gt 0 ] && bar="${bar}$(printf '%0.s─' $(seq 1 $empty))"
      printf "\r${CYAN}${BOLD}  ▸${NC} %-30s [${GREEN}%s${NC}] %3d%%" "$label" "$bar" "$pct"
    fi
  done

  # Final complete state
  bar=$(printf '%0.s█' $(seq 1 $width))
  printf "\r${GREEN}${BOLD}  ✓${NC} %-30s [${GREEN}%s${NC}] 100%%\n" "$label" "$bar"
}

# ─── Detect platform ────────────────────────────────────────────────
detect_platform() {
  local os arch

  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Darwin) os="darwin" ;;
    Linux)  os="linux" ;;
    MINGW*|MSYS*|CYGWIN*) os="windows" ;;
    *) fail "Unsupported OS: $os" ;;
  esac

  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) fail "Unsupported architecture: $arch" ;;
  esac

  PLATFORM="${os}-${arch}"
  BINARY_NAME="standup-${PLATFORM}"
  [ "$os" = "windows" ] && BINARY_NAME="${BINARY_NAME}.exe"
}

# ─── Fetch latest release tag ───────────────────────────────────────
get_latest_version() {
  local url="${GITHUB_API}/releases/latest"

  VERSION=$(curl -fsSL "$url" 2>/dev/null | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')

  if [ -z "$VERSION" ]; then
    fail "Could not determine latest release. Check https://github.com/${REPO_OWNER}/${REPO_NAME}/releases"
  fi
}

# ─── Header ──────────────────────────────────────────────────────────
echo ""
printf "${BOLD}  standup installer${NC}\n"
printf "${DIM}  ─────────────────────────────────────────────${NC}\n"
echo ""

# ─── Check curl ──────────────────────────────────────────────────────
if ! command -v curl &>/dev/null; then
  fail "curl is required but not found. Install it first."
fi

# ─── Detect platform ────────────────────────────────────────────────
detect_platform
info "Detected platform: ${BOLD}${PLATFORM}${NC}"

# ─── Get latest version ─────────────────────────────────────────────
info "Fetching latest release..."
get_latest_version
ok "Latest version: ${BOLD}${VERSION}${NC}"

# ─── Download binary ────────────────────────────────────────────────
DOWNLOAD_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${VERSION}/${BINARY_NAME}"
CHECKSUM_URL="${DOWNLOAD_URL}.sha256"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

info "Downloading ${BOLD}${BINARY_NAME}${NC} ${DIM}(${VERSION})${NC}"

# Download with progress bar
curl -fSL --progress-bar "$DOWNLOAD_URL" -o "${TMPDIR}/${BINARY_NAME}" 2>&1 | \
  stdbuf -oL tr '\r' '\n' 2>/dev/null | progress_bar "Downloading binary" || \
  curl -fSL "$DOWNLOAD_URL" -o "${TMPDIR}/${BINARY_NAME}" 2>/dev/null || \
  fail "Download failed. Binary may not exist for ${PLATFORM}.\n         Check: ${DOWNLOAD_URL}"

ok "Downloaded ${BINARY_NAME}"

# ─── Verify checksum ────────────────────────────────────────────────
info "Verifying checksum..."
if curl -fsSL "$CHECKSUM_URL" -o "${TMPDIR}/${BINARY_NAME}.sha256" 2>/dev/null; then
  cd "$TMPDIR"
  if command -v sha256sum &>/dev/null; then
    sha256sum -c "${BINARY_NAME}.sha256" --quiet 2>/dev/null && ok "Checksum verified" || warn "Checksum mismatch — proceed with caution"
  elif command -v shasum &>/dev/null; then
    EXPECTED=$(awk '{print $1}' "${BINARY_NAME}.sha256")
    ACTUAL=$(shasum -a 256 "${BINARY_NAME}" | awk '{print $1}')
    [ "$EXPECTED" = "$ACTUAL" ] && ok "Checksum verified" || warn "Checksum mismatch — proceed with caution"
  else
    warn "No sha256sum or shasum found — skipping verification"
  fi
  cd - >/dev/null
else
  warn "Checksum file not available — skipping verification"
fi

# ─── Install binary ─────────────────────────────────────────────────
mkdir -p "$BIN_DIR"

info "Installing to ${BIN_PATH}"
cp "${TMPDIR}/${BINARY_NAME}" "$BIN_PATH"
chmod +x "$BIN_PATH"
ok "Installed standup to ${BIN_PATH}"

# ─── Verify it runs ─────────────────────────────────────────────────
if "$BIN_PATH" --help &>/dev/null; then
  ok "Binary is working"
else
  warn "Binary installed but may not run on this platform"
fi

# ─── PATH check ──────────────────────────────────────────────────────
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
  echo ""
  warn "${BIN_DIR} is not in your PATH"
  echo ""
  echo "  Add this to your shell config (~/.bashrc, ~/.zshrc, etc.):"
  echo ""
  printf "    ${BOLD}export PATH=\"%s:\$PATH\"${NC}\n" "$BIN_DIR"
  echo ""
fi

# ─── Done ─────────────────────────────────────────────────────────────
echo ""
printf "${DIM}  ─────────────────────────────────────────────${NC}\n"
printf "${GREEN}${BOLD}  standup ${VERSION} installed successfully!${NC}\n"
echo ""
echo "  Usage:"
echo "    standup              # show yesterday's commits"
echo "    standup --today      # today's commits"
echo "    standup --ai         # AI-powered summary"
echo "    standup --help       # all options"
echo ""
