#!/bin/sh

# SSL certificate generation script for development

SSL_DIR="/etc/nginx/ssl"
SSL_DOMAIN="${SSL_DOMAIN:-localhost}"

# Ensure SSL directory exists
mkdir -p "${SSL_DIR}"
SSL_COUNTRY="${SSL_COUNTRY:-PT}"
SSL_STATE="${SSL_STATE:-Lisboa}"
SSL_CITY="${SSL_CITY:-Lisboa}"
SSL_ORG="${SSL_ORG:-ft_transcendence}"
SSL_OU="${SSL_OU:-Development}"

echo "Generating self-signed SSL certificate for ${SSL_DOMAIN}..."

# Generate private key
openssl genrsa -out "${SSL_DIR}/nginx.key" 2048

# Generate certificate signing request
openssl req -new -key "${SSL_DIR}/nginx.key" -out "${SSL_DIR}/nginx.csr" -subj "/C=${SSL_COUNTRY}/ST=${SSL_STATE}/L=${SSL_CITY}/O=${SSL_ORG}/OU=${SSL_OU}/CN=${SSL_DOMAIN}"

# Generate self-signed certificate
openssl x509 -req -days 365 -in "${SSL_DIR}/nginx.csr" -signkey "${SSL_DIR}/nginx.key" -out "${SSL_DIR}/cert.pem"

# Clean up CSR file
rm "${SSL_DIR}/nginx.csr"

echo "SSL certificate generated successfully!"
echo "Certificate: ${SSL_DIR}/cert.pem"
echo "Private key: ${SSL_DIR}/nginx.key"
