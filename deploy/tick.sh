#!/usr/bin/env bash
# Раз в 5 минут (cron): напоминания компаниям о заявках без ответа, сводки админу.
KEY="$(grep -E '^ADMIN_KEY=' /var/www/sven/.env.production | head -1 | cut -d= -f2-)"
[ -n "$KEY" ] && curl -fsS --max-time 60 "http://127.0.0.1:3100/api/cron/tick?key=$KEY" >/dev/null
