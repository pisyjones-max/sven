#!/usr/bin/env bash
# Ставит cron: напоминания каждые 5 минут и копия базы в 03:20. Можно запускать повторно. Нужен root: sudo bash deploy/cron.sh
set -euo pipefail
APP_DIR=/var/www/sven
[ -w /etc/cron.d ] || { echo "Нет прав на /etc/cron.d. Запустите: sudo bash $APP_DIR/deploy/cron.sh"; exit 0; }
cat > /etc/cron.d/sven <<CRON
*/5 * * * * root bash $APP_DIR/deploy/tick.sh >/dev/null 2>&1
20 3 * * * root bash $APP_DIR/deploy/backup.sh >> /var/log/sven-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/sven
echo "cron установлен: /etc/cron.d/sven"
