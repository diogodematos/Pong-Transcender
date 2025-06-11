#!/bin/sh
set -e

# Generate SSL certificates if they don't exist
if [ ! -f /etc/nginx/ssl/nginx.crt ]; then
    echo "Generating SSL certificates..."
    /usr/local/bin/generate-ssl.sh
fi

# Wait for backend services to be ready (optional)
if [ "$WAIT_FOR_SERVICES" = "true" ]; then
    echo "Waiting for services to be ready..."
    sleep 10
fi

# Start nginx
exec "$@"
