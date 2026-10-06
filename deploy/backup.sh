#!/usr/bin/env bash
# Ежедневная копия базы. Запускается по cron (ставит deploy/cron.sh), вручную: bash /var/www/sven/deploy/backup.sh
# Копии лежат в $DATA_DIR/backups, хранятся 14 дней. Для базы в Redis копия берётся через /api/admin/export.
# Копия на другой сервер: BACKUP_TG=1 в .env.production отправляет файл админу в Telegram (до 45 МБ).
set -euo pipefail
APP_DIR=/var/www/sven
ENV_FILE="$APP_DIR/.env.production"
getenv() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true; }
DATA_DIR="$(getenv DATA_DIR)"
OUT="${DATA_DIR:-/var/www/sven-data}/backups"
mkdir -p "$OUT"
FILE="$OUT/kv-$(date +%Y%m%d-%H%M).json.gz"
if [ -n "$DATA_DIR" ] && [ -f "$DATA_DIR/kv.json" ]; then
  gzip -c "$DATA_DIR/kv.json" > "$FILE"   # файл базы пишется атомарно, копия всегда целая
else
  curl -fsS --max-time 120 "http://127.0.0.1:3100/api/admin/export?key=$(getenv ADMIN_KEY)" | gzip > "$FILE"
fi
[ -s "$FILE" ] || { echo "Пустая копия: $FILE"; rm -f "$FILE"; exit 1; }
find "$OUT" -name 'kv-*.json.gz' -mtime +14 -delete
echo "$(date -Is) копия $FILE ($(du -h "$FILE" | cut -f1))"
if [ "$(getenv BACKUP_TG)" = "1" ] && [ -n "$(getenv TG_TOKEN)" ] && [ -n "$(getenv TG_ADMIN_CHAT_ID)" ] && [ "$(stat -c %s "$FILE")" -lt 47000000 ]; then
  BASE="$(getenv TG_API_BASE)"; BASE="${BASE:-https://api.telegram.org}"
  curl -fsS --max-time 120 -F "chat_id=$(getenv TG_ADMIN_CHAT_ID)" -F "document=@$FILE" "${BASE%/}/bot$(getenv TG_TOKEN)/sendDocument" >/dev/null || echo "Не удалось отправить копию в Telegram"
fi
