#!/usr/bin/env bash
# Ejemplo: proxy RootRouter para Psychat (memoria local).
# Uso: HUB_ORIGIN=https://tu-hub.vercel.app ./scripts/psychat-rootrouter-proxy.example.sh
# Local: HUB_ORIGIN=http://localhost:3000 ./scripts/psychat-rootrouter-proxy.example.sh

set -euo pipefail
HUB_ORIGIN="${HUB_ORIGIN:-http://localhost:3000}"
HUB_ORIGIN="${HUB_ORIGIN%/}"

export ROOTROUTER_UPSTREAM_ORIGIN="$HUB_ORIGIN"
export ROOTROUTER_STORE_PATH="${ROOTROUTER_STORE_PATH:-$HOME/.rootrouter/psychat-store.json}"
export ROOTROUTER_HOST="${ROOTROUTER_HOST:-127.0.0.1}"
export PORT="${PORT:-8787}"

echo "Upstream origin: $ROOTROUTER_UPSTREAM_ORIGIN (path /v1/chat/completions preserved by proxy)"
echo "Store: $ROOTROUTER_STORE_PATH"
echo "Listen: http://${ROOTROUTER_HOST}:${PORT}"
echo "Health: curl -s http://${ROOTROUTER_HOST}:${PORT}/healthz"

exec npx -p @rootrouter/proxy@beta rootrouter-proxy
