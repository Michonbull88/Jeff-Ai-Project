#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp "$ROOT/packaging/macos/Install JEFF.command" "$STAGE/Install JEFF.command"
chmod +x "$STAGE/Install JEFF.command"
tar -C "$ROOT" --exclude=node_modules --exclude=.next --exclude=.jeff-data --exclude=.env.local --exclude=dist --exclude=.git --exclude=tests --exclude=test-results -czf "$STAGE/jeff-app.tar.gz" .
mkdir -p "$ROOT/dist"
hdiutil create -volname "JEFF Installer" -srcfolder "$STAGE" -ov -format UDZO "$ROOT/dist/JEFF-Setup-macOS.dmg"
