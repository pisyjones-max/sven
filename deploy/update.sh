#!/usr/bin/env bash
# Обновление: забрать main, собрать, перезапустить. Запуск: bash /var/www/sven/deploy/update.sh
# Приватный репозиторий:  GH_TOKEN=ghp_xxx bash update.sh
set -euo pipefail
APP_DIR=/var/www/sven
PORT=3100
cd "$APP_DIR"
URL="https://${GH_TOKEN:+x-access-token:$GH_TOKEN@}github.com/pisyjones-max/sven.git"
git fetch "$URL" main && git reset --hard FETCH_HEAD
npm ci --no-audit --no-fund
NODE_OPTIONS=--max-old-space-size=1200 npm run build
if pm2 describe sven >/dev/null 2>&1; then pm2 reload sven --update-env
else pm2 start node_modules/next/dist/bin/next --name sven -- start -p $PORT; fi
pm2 save
sleep 3; curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:$PORT/"
