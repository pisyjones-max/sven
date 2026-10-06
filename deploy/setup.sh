#!/usr/bin/env bash
# Первичная установка на VDS (Ubuntu, Node 20+, pm2 и nginx уже стоят, как для PLATFORMA).
# Запуск:  sudo bash setup.sh [домен]
# Приватный репозиторий:  sudo GH_TOKEN=ghp_xxx bash setup.sh [домен]
set -euo pipefail

APP_DIR=/var/www/sven
DATA_DIR=/var/www/sven-data
PORT=3100
DOMAIN="${1:-}"
REPO=github.com/pisyjones-max/sven.git

echo "== Диск и память"; df -h / | tail -1; free -m | sed -n 2p

node -e 'process.exit(parseInt(process.versions.node)>=20?0:1)' || { echo "Нужен Node 20+: $(node -v)"; exit 1; }
command -v pm2 >/dev/null || npm i -g pm2

# Своп, чтобы сборка не убила соседний сайт на 2 ГБ памяти
if [ "$(swapon --show | wc -l)" -eq 0 ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p "$APP_DIR" "$DATA_DIR"
URL="https://${GH_TOKEN:+x-access-token:$GH_TOKEN@}$REPO"
if [ ! -d "$APP_DIR/.git" ]; then git clone "$URL" "$APP_DIR"; git -C "$APP_DIR" remote set-url origin "https://$REPO"; fi

SITE="http://$(curl -s ifconfig.me):8080"; [ -n "$DOMAIN" ] && SITE="https://$DOMAIN"
if [ ! -f "$APP_DIR/.env.production" ]; then
cat > "$APP_DIR/.env.production" <<ENV
NEXT_PUBLIC_SITE_URL=$SITE
NEXT_PUBLIC_SITE_NAME=Платформа домов
# Тестовые компании для проверки вида. Перед боевым запуском удалить эту строку.
SEED_DEMO=1
DATA_DIR=$DATA_DIR
ADMIN_KEY=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)
TG_WEBHOOK_SECRET=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)
TG_TOKEN=
# Ключ SMS.ru: вход по номеру и подтверждение телефона компаний
SMS_RU_API_ID=
# MAX: токен бота и его имя (без @)
MAX_BOT_TOKEN=
NEXT_PUBLIC_MAX_BOT=
# Палитра: emerald, graphite, indigo, ocean
NEXT_PUBLIC_THEME=emerald
TG_ADMIN_CHAT_ID=
# Яндекс SmartCaptcha: ключ клиента (публичный) и ключ сервера. Пусто = капча выключена
NEXT_PUBLIC_SMARTCAPTCHA_SITEKEY=
SMARTCAPTCHA_SERVER_KEY=
# Платные лиды: 1 = списывать за принятую заявку; стартовый бонус, ₽; контакт для пополнения
# BILLING=1
# BILLING_WELCOME=1000
# NEXT_PUBLIC_SUPPORT_CONTACT=@ваш_telegram
# 1 = присылать ночную копию базы админу в Telegram
# BACKUP_TG=1
NEXT_PUBLIC_TG_BOT=
# Если Telegram с сервера недоступен, укажи Cloudflare Worker-прокси:
# TG_API_BASE=https://shy-limit-0b22.pisyjones.workers.dev
ENV
fi

# Nginx
if [ -n "$DOMAIN" ]; then LISTEN="listen 80;"; NAME="server_name $DOMAIN;"; else LISTEN="listen 8080;"; NAME="server_name _;"; fi
cat > /etc/nginx/sites-available/sven <<NGINX
server {
  $LISTEN
  $NAME
  client_max_body_size 5m;
  location / {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/sven /etc/nginx/sites-enabled/sven
nginx -t && systemctl reload nginx
[ -z "$DOMAIN" ] && command -v ufw >/dev/null && ufw allow 8080/tcp || true
[ -n "$DOMAIN" ] && command -v certbot >/dev/null && certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || true

bash "$APP_DIR/deploy/update.sh"

echo
echo "Готово: $SITE"
echo "Ключи и Telegram: nano $APP_DIR/.env.production, затем: bash $APP_DIR/deploy/update.sh"
echo "ADMIN_KEY: $(grep ^ADMIN_KEY "$APP_DIR/.env.production" | cut -d= -f2)"
