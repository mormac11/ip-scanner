#!/bin/bash

echo "==================================="
echo "IP Scanner - SSL Setup Script"
echo "==================================="
echo ""

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "Creating .env.prod from template..."
    cp .env.prod.example .env.prod
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.prod with your actual values:"
    echo "   - DOMAIN: Your application domain (e.g., ipscanner.yourdomain.com)"
    echo "   - KEYCLOAK_DOMAIN: Your auth domain (e.g., auth.yourdomain.com)"
    echo "   - LETSENCRYPT_EMAIL: Your email for SSL certificates"
    echo "   - DB_PASSWORD: Secure database password"
    echo "   - KEYCLOAK_ADMIN_PASSWORD: Secure admin password"
    echo ""
    read -p "Press Enter after you've edited .env.prod..."
fi

# Load environment variables
source .env.prod

# Validate required variables
if [ -z "$DOMAIN" ] || [ "$DOMAIN" == "ipscanner.yourdomain.com" ]; then
    echo "❌ Error: DOMAIN not set in .env.prod"
    exit 1
fi

if [ -z "$LETSENCRYPT_EMAIL" ] || [ "$LETSENCRYPT_EMAIL" == "your-email@example.com" ]; then
    echo "❌ Error: LETSENCRYPT_EMAIL not set in .env.prod"
    exit 1
fi

echo "Configuration:"
echo "  Domain: $DOMAIN"
echo "  Keycloak: $KEYCLOAK_DOMAIN"
echo "  Email: $LETSENCRYPT_EMAIL"
echo ""

# Check DNS
echo "Checking DNS configuration..."
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -n1)
KEYCLOAK_IP=$(dig +short "$KEYCLOAK_DOMAIN" | tail -n1)

if [ -z "$DOMAIN_IP" ]; then
    echo "⚠️  Warning: DNS not configured for $DOMAIN"
    echo "   Make sure you have an A record pointing to this server's IP"
else
    echo "✓ $DOMAIN → $DOMAIN_IP"
fi

if [ -z "$KEYCLOAK_IP" ]; then
    echo "⚠️  Warning: DNS not configured for $KEYCLOAK_DOMAIN"
else
    echo "✓ $KEYCLOAK_DOMAIN → $KEYCLOAK_IP"
fi

echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Update frontend .env.production with actual domains
echo "Updating frontend configuration..."
cat > frontend/.env.production << EOF
REACT_APP_OIDC_AUTHORITY=https://${KEYCLOAK_DOMAIN}/realms/ipscanner
REACT_APP_OIDC_CLIENT_ID=ipscanner-frontend
REACT_APP_OIDC_REDIRECT_URI=https://${DOMAIN}
REACT_APP_API_URL=/api/v1
EOF

# Stop development environment
echo "Stopping development environment..."
docker compose down

# Start production environment
echo "Starting production environment..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo ""
echo "==================================="
echo "Deployment started!"
echo "==================================="
echo ""
echo "Monitor SSL certificate acquisition:"
echo "  docker compose -f docker-compose.prod.yml logs -f acme-companion"
echo ""
echo "Check all services:"
echo "  docker compose -f docker-compose.prod.yml ps"
echo ""
echo "Access your application at:"
echo "  https://$DOMAIN"
echo ""
echo "Next steps:"
echo "1. Wait 1-2 minutes for SSL certificates to be obtained"
echo "2. Configure Keycloak at https://$KEYCLOAK_DOMAIN/admin"
echo "   - Update client redirect URIs to https://$DOMAIN/*"
echo "3. Access your application at https://$DOMAIN"
echo ""
