#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HOME/Library/Application Support/JEFF/app"
mkdir -p "$APP"
tar -xzf "$HERE/jeff-app.tar.gz" -C "$APP"
if ! command -v brew >/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -x /opt/homebrew/bin/brew ]]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi
fi
brew install node python ollama
if [[ ! -f "$APP/.env.local" ]]; then python3 - <<'PY' > "$APP/.env.local"
import secrets
print('JEFF_AUTH_SECRET=' + secrets.token_hex(32))
print('APP_ORIGIN=http://localhost:3000')
print('OLLAMA_BASE_URL=http://127.0.0.1:11435')
print('OLLAMA_MODEL=qwen3:1.7b')
PY
fi
node "$APP/scripts/unix-portable.mjs" setup
cat > "$HOME/Desktop/Start JEFF.command" <<EOF
#!/usr/bin/env bash
node "$APP/scripts/unix-portable.mjs" start
EOF
chmod +x "$HOME/Desktop/Start JEFF.command"
echo "JEFF is installed. Double-click Start JEFF on your Desktop."
read -r -p "Press Return to close."
