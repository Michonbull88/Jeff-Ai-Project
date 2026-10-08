#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HOME/.local/share/jeff"
BIN="$HOME/.local/bin"
mkdir -p "$APP" "$BIN"
tar -xzf "$HERE/jeff-app.tar.gz" -C "$APP"

if ! command -v curl >/dev/null || ! command -v python3 >/dev/null || ! python3 -m venv --help >/dev/null 2>&1; then
  if command -v apt-get >/dev/null; then
    sudo apt-get update
    sudo apt-get install -y curl python3 python3-venv
  elif command -v dnf >/dev/null; then
    sudo dnf install -y curl python3
  elif command -v pacman >/dev/null; then
    sudo pacman -Sy --needed curl python
  else
    echo "Install curl, Python 3, and Python venv with your Linux package manager, then run this installer again."
    exit 1
  fi
fi
if ! command -v node >/dev/null || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  export NVM_DIR="$HOME/.nvm"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm install 22
fi
if ! command -v ollama >/dev/null; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
if [[ ! -f "$APP/.env.local" ]]; then python3 - <<'PY' > "$APP/.env.local"
import secrets
print('JEFF_AUTH_SECRET=' + secrets.token_hex(32))
print('APP_ORIGIN=http://localhost:3000')
print('OLLAMA_BASE_URL=http://127.0.0.1:11435')
print('OLLAMA_MODEL=qwen3:1.7b')
PY
fi
node "$APP/scripts/unix-portable.mjs" setup
cat > "$BIN/jeff" <<EOF
#!/usr/bin/env bash
exec node "$APP/scripts/unix-portable.mjs" start
EOF
chmod +x "$BIN/jeff"
mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/jeff.desktop" <<EOF
[Desktop Entry]
Name=JEFF
Comment=Your local AI tutor
Exec=$BIN/jeff
Terminal=true
Type=Application
Categories=Education;
EOF
echo "JEFF is installed. Run: $BIN/jeff"
