#!/usr/bin/env bash
# Setup OpenCode (Xemoz REST fork) di Termux lewat proot Ubuntu.
#
# Jalankan di DALAM proot Ubuntu (bukan di Termux langsung), misal:
#   proot-distro login ubuntu
#   curl -fsSL https://raw.githubusercontent.com/<user>/<repo>/main/setup-termux.sh | bash
#
# Atau setelah clone manual:
#   git clone https://github.com/<user>/<repo>.git opencode-xemoz
#   cd opencode-xemoz
#   bash setup-termux.sh
set -euo pipefail

REPO_URL="${OPENCODE_XEMOZ_REPO:-}"
INSTALL_DIR="${OPENCODE_XEMOZ_DIR:-$HOME/opencode-xemoz}"
BUN_VERSION="1.3.14"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log() { echo -e "${GREEN}==>${NC} $1"; }
warn() { echo -e "${YELLOW}==>${NC} $1"; }
err() { echo -e "${RED}==>${NC} $1" >&2; }

# 1. Pastikan dependency dasar ada (git, curl, unzip — dibutuhkan installer bun)
log "Mengecek dependency dasar (git, curl, unzip)..."
sudo_cmd=""
if command -v sudo >/dev/null 2>&1 && [ "$(id -u)" -ne 0 ]; then
  sudo_cmd="sudo"
fi
if ! command -v git >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1 || ! command -v unzip >/dev/null 2>&1; then
  $sudo_cmd apt-get update -y
  $sudo_cmd apt-get install -y git curl unzip
fi

# 2. Install Bun kalau belum ada
if ! command -v bun >/dev/null 2>&1; then
  log "Bun belum terpasang, menginstall bun@${BUN_VERSION}..."
  curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
  export PATH="$HOME/.bun/bin:$PATH"
  if ! grep -q '.bun/bin' "$HOME/.bashrc" 2>/dev/null; then
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.bashrc"
  fi
else
  log "Bun sudah terpasang: $(bun --version)"
fi

# 3. Clone atau update repo
if [ -d "$INSTALL_DIR/.git" ]; then
  log "Repo sudah ada di $INSTALL_DIR, menarik update terbaru..."
  git -C "$INSTALL_DIR" pull --ff-only
elif [ -n "$REPO_URL" ]; then
  log "Cloning $REPO_URL ke $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
else
  if [ -f "./package.json" ] && grep -q '"name": "opencode"' ./package.json 2>/dev/null; then
    INSTALL_DIR="$(pwd)"
    log "Terdeteksi sudah berada di dalam folder project ($INSTALL_DIR), lanjut pakai folder ini."
  else
    err "Repo belum ada dan OPENCODE_XEMOZ_REPO tidak di-set."
    err "Set dulu, misal:"
    err "  export OPENCODE_XEMOZ_REPO=https://github.com/<user>/<repo>.git"
    err "  bash setup-termux.sh"
    exit 1
  fi
fi

cd "$INSTALL_DIR"

# 4. Install dependencies
log "Menjalankan bun install (bisa agak lama di HP, sabar ya)..."
bun install

# 5. Buat launcher praktis: perintah `opencode-xemoz` dari mana saja
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
LAUNCHER="$BIN_DIR/opencode-xemoz"
cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
export PATH="\$HOME/.bun/bin:\$PATH"
cd "$INSTALL_DIR"
exec bun run packages/opencode/src/index.ts "\$@"
EOF
chmod +x "$LAUNCHER"

if ! grep -q '.local/bin' "$HOME/.bashrc" 2>/dev/null; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi

log "Selesai! ✅"
echo ""
echo "Cara jalankan opencode (Xemoz REST engine):"
echo "  1. Buka terminal baru (atau: source ~/.bashrc)"
echo "  2. Jalankan: opencode-xemoz"
echo ""
echo "Atau langsung sekarang tanpa buka terminal baru:"
echo "  PATH=\"\$HOME/.bun/bin:\$PATH\" \"$LAUNCHER\""
