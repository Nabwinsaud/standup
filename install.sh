#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────
REPO="https://github.com/Nabwinsaud/standup.git"
INSTALL_DIR="${HOME}/.local/share/standup"
BIN_DIR="${HOME}/.local/bin"
BIN_LINK="${BIN_DIR}/standup"

# ─── Colors ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { printf "${CYAN}${BOLD}▸${NC} %s\n" "$1"; }
ok()    { printf "${GREEN}${BOLD}✓${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}${BOLD}!${NC} %s\n" "$1"; }
fail()  { printf "${RED}${BOLD}✗${NC} %s\n" "$1"; exit 1; }

# ─── Check deps ──────────────────────────────────────────────────────
check_dep() {
  if ! command -v "$1" &>/dev/null; then
    fail "$1 is required but not found. Install it first."
  fi
}

check_dep git

# Check for bun — try common locations
if command -v bun &>/dev/null; then
  BUN="bun"
elif [ -x "${HOME}/.bun/bin/bun" ]; then
  BUN="${HOME}/.bun/bin/bun"
else
  warn "Bun not found. Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  BUN="${HOME}/.bun/bin/bun"
  if [ ! -x "$BUN" ]; then
    fail "Bun installation failed. Install manually: https://bun.sh"
  fi
  ok "Bun installed"
fi

info "Using bun at: $BUN"

# ─── Install / Update ────────────────────────────────────────────────
if [ -d "$INSTALL_DIR" ]; then
  info "Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull --ff-only || {
    warn "git pull failed — doing a fresh clone"
    cd /
    rm -rf "$INSTALL_DIR"
    git clone "$REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  }
else
  info "Cloning standup..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

ok "Source ready at $INSTALL_DIR"

# ─── Install deps ────────────────────────────────────────────────────
info "Installing dependencies..."
"$BUN" install --frozen-lockfile 2>/dev/null || "$BUN" install
ok "Dependencies installed"

# ─── Symlink ──────────────────────────────────────────────────────────
mkdir -p "$BIN_DIR"

# Create a wrapper script instead of a direct symlink so bun resolves paths correctly
cat > "$BIN_LINK" << EOF
#!/usr/bin/env bash
exec "${BUN}" "${INSTALL_DIR}/src/index.ts" "\$@"
EOF
chmod +x "$BIN_LINK"

ok "Linked: standup → $BIN_LINK"

# ─── PATH check ──────────────────────────────────────────────────────
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
  warn "$BIN_DIR is not in your PATH"
  echo ""
  echo "  Add this to your shell config (~/.bashrc, ~/.zshrc, etc.):"
  echo ""
  printf "    ${BOLD}export PATH=\"%s:\$PATH\"${NC}\n" "$BIN_DIR"
  echo ""
fi

# ─── Done ─────────────────────────────────────────────────────────────
echo ""
printf "${GREEN}${BOLD}  standup installed successfully!${NC}\n"
echo ""
echo "  Usage:"
echo "    standup              # show yesterday's commits"
echo "    standup --today      # today's commits"
echo "    standup --ai         # AI-powered summary"
echo "    standup --help       # all options"
echo ""
