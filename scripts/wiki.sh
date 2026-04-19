#!/usr/bin/env bash
set -euo pipefail

PORT="${WIKI_PORT:-4173}"
HOST="127.0.0.1"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL="http://${HOST}:${PORT}/wiki/"

cd "$ROOT_DIR"

echo "DionAi Wiki"
echo "  root:  $ROOT_DIR"
echo "  url:   $URL"
echo "  stop:  Ctrl+C"
echo

(sleep 0.7 && open "$URL" >/dev/null 2>&1) &

exec python3 -m http.server "$PORT" --bind "$HOST"
