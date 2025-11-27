# SSL Setup Guide - IP Scanner

This guide will help you deploy IP Scanner with SSL/HTTPS on port 443 using Let's Encrypt.

## Prerequisites

1. **Domain name** pointing to your server (e.g., `ipscanner.yourdomain.com`)
2. **Ports 80 and 443** open and accessible from the internet
3. **DNS records** configured:
   - `A` record for `ipscanner.yourdomain.com` → Your server IP
   - `A` record for `auth.yourdomain.com` → Your server IP (for Keycloak)

## Setup Steps

### 1. Create Production Environment File

```bash
cp .env.prod.example .env.prod
```

Edit `.env.prod` with your actual values:
```bash
nano .env.prod
```

Update these values:
```env
DOMAIN=ipscanner.yourdomain.com
KEYCLOAK_DOMAIN=auth.yourdomain.com
LETSENCRYPT_EMAIL=your-email@example.com
DB_PASSWORD=your-secure-password-here
KEYCLOAK_ADMIN_PASSWORD=your-secure-admin-password
```

### 2. Stop Development Environment

```bash
docker compose down
```

### 3. Start Production Environment

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

This will:
- Start NGINX reverse proxy on ports 80 and 443
- Automatically obtain SSL certificates from Let's Encrypt
- Configure HTTPS for both the application and Keycloak

### 4. Configure Keycloak for Production

1. Access Keycloak admin console: `https://auth.yourdomain.com/admin`
2. Login with credentials from `.env.prod`
3. Update the IP Scanner client settings:
   - **Valid Redirect URIs**: `https://ipscanner.yourdomain.com/*`
   - **Valid Post Logout Redirect URIs**: `https://ipscanner.yourdomain.com/*`
   - **Web Origins**: `https://ipscanner.yourdomain.com`

### 5. Update Frontend Configuration

The frontend needs to know about the new OIDC endpoints. Update `frontend/.env.production`:

```env
REACT_APP_OIDC_AUTHORITY=https://auth.yourdomain.com/realms/ipscanner
REACT_APP_OIDC_CLIENT_ID=ipscanner-frontend
REACT_APP_OIDC_REDIRECT_URI=https://ipscanner.yourdomain.com
REACT_APP_API_URL=/api/v1
```

Then rebuild the frontend:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build frontend
```

### 6. Verify SSL Certificates

Check that SSL certificates were obtained:
```bash
docker compose -f docker-compose.prod.yml logs acme-companion
```

You should see messages about successfully obtaining certificates for your domains.

### 7. Access Your Application

Navigate to: `https://ipscanner.yourdomain.com`

The browser should show a valid SSL certificate with a green lock icon.

## Firewall Configuration

Make sure your firewall allows traffic on ports 80 and 443:

### Ubuntu/Debian (UFW)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### CentOS/RHEL (firewalld)
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Cloud Providers
If running on AWS, Azure, or GCP, ensure your security group/network rules allow inbound traffic on ports 80 and 443.

## Certificate Renewal

Let's Encrypt certificates are valid for 90 days. The `acme-companion` container automatically renews them before expiration (typically at 60 days).

Check renewal status:
```bash
docker compose -f docker-compose.prod.yml logs acme-companion | grep -i renew
```

## Troubleshooting

### Certificate Not Obtained
1. Verify DNS is pointing to your server: `dig ipscanner.yourdomain.com`
2. Check ports 80 and 443 are accessible: `telnet yourdomain.com 443`
3. Check logs: `docker compose -f docker-compose.prod.yml logs acme-companion`

### OIDC Login Not Working
1. Verify Keycloak redirect URIs are set to HTTPS URLs
2. Check browser console for errors
3. Verify OIDC configuration in frontend matches your domain

### Backend API Not Reachable
1. Check nginx-proxy logs: `docker compose -f docker-compose.prod.yml logs nginx-proxy`
2. Verify frontend can reach API: `curl https://ipscanner.yourdomain.com/api/v1/status`

## Alternative: Self-Signed Certificate (Testing Only)

If you don't have a domain or need to test locally, you can use a self-signed certificate:

```bash
# Generate self-signed certificate
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/CN=localhost"

# Use a simplified nginx config (I can provide this if needed)
```

**Note**: Browsers will show a security warning with self-signed certificates.

## Monitoring

Check application status:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

## Backup

Important files to backup:
- `/var/lib/docker/volumes/nginx-certs` - SSL certificates
- PostgreSQL data volume
- `.env.prod` - Configuration

## Security Recommendations

1. **Change default passwords** in `.env.prod`
2. **Enable firewall** and only allow necessary ports
3. **Keep Docker images updated**: `docker compose -f docker-compose.prod.yml pull`
4. **Monitor logs** for suspicious activity
5. **Set up automated backups** of the database
