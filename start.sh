#!/bin/bash
# Start everything for SomlengPit:  ./start.sh
#   1. VoxPocket model (port 7870) — skip if already running
#   2. backend (port 8787)   3. website (port 4173)   4. public Cloudflare link
cd "$(dirname "$0")"
curl -s -o /dev/null --max-time 2 http://127.0.0.1:7870 || (~/research/AI/voxpocket/run.sh > /tmp/voxpocket.log 2>&1 &)
node server/index.mjs & 
npm run build >/dev/null && npx vite preview --port 4173 --strictPort &
cloudflared tunnel --url http://localhost:4173 --no-autoupdate --protocol http2 2>&1 | grep --line-buffered -o 'https://[a-z0-9-]*\.trycloudflare\.com'
