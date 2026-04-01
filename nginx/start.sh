#!/bin/bash
set -e

echo "Starting SSL certificate initialization..."

# Check if certificates already exist
if [ -f "/etc/letsencrypt/live/noc.idone.co.il/fullchain.pem" ]; then
    echo "SSL certificates already exist. Starting Nginx..."
    nginx -g "daemon off;"
    exit 0
fi

# Create directories
echo "Creating directories..."
mkdir -p /etc/letsencrypt/live/noc.idone.co.il
mkdir -p /var/www/certbot

# Stop any running nginx
pkill nginx || true
sleep 1

# Start nginx for ACME challenge validation
echo "Starting temporary Nginx for ACME validation..."
nginx -c /etc/nginx/nginx.temp.conf &

# Wait for nginx to start
sleep 2

# Request certificates from Let's Encrypt
echo "Requesting SSL certificate from Let's Encrypt..."
certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email admin@idone.co.il \
    --agree-tos \
    --no-eff-email \
    --domains noc.idone.co.il \
    --force-renewal \
    || echo "Certificate request completed or already exists"

# Stop temporary nginx
pkill nginx || true
sleep 1

# Check if certificate was created
if [ -f "/etc/letsencrypt/live/noc.idone.co.il/fullchain.pem" ]; then
    echo "SSL certificate obtained successfully!"
else
    echo "Warning: SSL certificate not found. Creating self-signed certificate for testing..."
    
    # Create self-signed certificate as fallback
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/letsencrypt/live/noc.idone.co.il/privkey.pem \
        -out /etc/letsencrypt/live/noc.idone.co.il/fullchain.pem \
        -subj "/CN=noc.idone.co.il"
fi

# Start Nginx with SSL
echo "Starting Nginx with SSL..."
nginx -g "daemon off;"
