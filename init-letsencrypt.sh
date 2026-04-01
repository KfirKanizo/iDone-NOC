#!/bin/bash
set -e

echo "=========================================="
echo "Let's Encrypt SSL Certificate Setup"
echo "=========================================="

# Configuration
DOMAIN="noc.idone.co.il"
EMAIL="admin@idone.co.il"
NGINX_CONTAINER="idine-noc-nginx-1"
DATA_PATH="./data/certbot"

# Create necessary directories
echo "Creating directories..."
mkdir -p "${DATA_PATH}/etc"
mkdir -p "${DATA_PATH}/var/www/certbot"

# Check if certificates already exist
if [ -d "${DATA_PATH}/etc/live/${DOMAIN}" ]; then
    echo "SSL certificates already exist at ${DATA_PATH}/etc/live/${DOMAIN}"
    echo "Skipping certificate generation."
    exit 0
fi

echo "Stopping Nginx to allow certbot to bind to port 80..."
docker compose -f docker-compose.prod.yml stop nginx || true

echo "Starting temporary Nginx for ACME challenge..."
docker run --rm \
    -v "${DATA_PATH}/etc:/etc/letsencrypt" \
    -v "${DATA_PATH}/var/www/certbot:/var/www/certbot" \
    -p 80:80 \
    --name temp-nginx \
    nginx:alpine \
    sh -c "
        cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 404;
    }
}
EOF
        nginx -g 'daemon off;'
    " &

NGINX_PID=$!
sleep 3

echo "Requesting SSL certificate from Let's Encrypt..."
docker run --rm \
    --env-file ./backend/.env \
    -v "${DATA_PATH}/etc:/etc/letsencrypt" \
    -v "${DATA_PATH}/var/www/certbot:/var/www/certbot" \
    certbot/certbot \
    certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --domains "${DOMAIN}" \
    --keep-until-expiring

# Kill temporary nginx
echo "Stopping temporary Nginx..."
kill $NGINX_PID 2>/dev/null || docker stop temp-nginx 2>/dev/null || true
sleep 2

# Verify certificate was created
if [ -d "${DATA_PATH}/etc/live/${DOMAIN}" ]; then
    echo ""
    echo "=========================================="
    echo "SSL certificate successfully obtained!"
    echo "Certificate location: ${DATA_PATH}/etc/live/${DOMAIN}"
    echo "=========================================="
else
    echo "ERROR: Certificate generation failed!"
    exit 1
fi

echo "Starting all services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "Setup complete! Your site should be accessible at https://${DOMAIN}"
echo ""
echo "Note: Certificates will auto-renew every 90 days via the certbot service."
