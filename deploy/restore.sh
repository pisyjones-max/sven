#!/usr/bin/env bash
# Восстановление базы из копии (для хранения в файле DATA_DIR). Запуск: bash /var/www/sven/deploy/restore.sh /var/www/sven-data/backups/kv-ГГГГММДД-ЧЧММ.json.gz
set -euo pipefail
[ -f "${1:-}" ] || { echo "Укажите файл копии. Доступные:"; ls -1 /var/www/sven-data/backups 2>/dev/null; exit 1; }
DATA_DIR="$(grep -E '^DATA_DIR=' /var/www/sven/.env.production | cut -d= -f2-)"
[ -n "$DATA_DIR" ] || { echo "DATA_DIR не задан: база в Redis, восстановление через его панель"; exit 1; }
[ -f "$DATA_DIR/kv.json" ] && cp "$DATA_DIR/kv.json" "$DATA_DIR/kv.before-restore.json"
gunzip -c "$1" > "$DATA_DIR/kv.json.tmp" && mv "$DATA_DIR/kv.json.tmp" "$DATA_DIR/kv.json"
pm2 reload sven --update-env
echo "Готово. Прежняя база сохранена: $DATA_DIR/kv.before-restore.json"
