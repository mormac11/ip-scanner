# Keycloak Authentication Setup Guide

This guide will walk you through setting up Keycloak authentication for the IP Scanner application.

## Overview

The IP Scanner uses Keycloak for authentication with the following components:
- **Keycloak**: Self-hosted identity and access management server
- **Backend (Go)**: JWT token validation with JWKS
- **Frontend (React)**: OpenID Connect (OIDC) authentication flow

## Quick Start

### 1. Start All Services

```bash
docker compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Keycloak server (port 8081)
- API backend (port 8080)
- Frontend (port 3000)

### 2. Access Keycloak Admin Console

1. Open http://localhost:8081
2. Click "Administration Console"
3. Login with:
   - **Username**: `admin`
   - **Password**: `admin`

### 3. Create Realm

1. Click the dropdown at the top left (says "master")
2. Click "Create Realm"
3. Enter realm name: `ipscanner`
4. Click "Create"

### 4. Create Frontend Client

1. In the `ipscanner` realm, go to **Clients**
2. Click "Create client"
3. Configure:
   - **Client ID**: `ipscanner-frontend`
   - **Client type**: OpenID Connect
   - Click "Next"
4. Capability config:
   - **Client authentication**: OFF
   - **Authorization**: OFF
   - **Standard flow**: ON (enabled)
   - **Direct access grants**: OFF
   - Click "Next"
5. Login settings:
   - **Valid redirect URIs**: `http://localhost:3000/*`
   - **Valid post logout redirect URIs**: `http://localhost:3000/*`
   - **Web origins**: `http://localhost:3000`
   - Click "Save"

### 5. Create Backend Client

1. Go to **Clients** again
2. Click "Create client"
3. Configure:
   - **Client ID**: `ipscanner-api`
   - **Client type**: OpenID Connect
   - Click "Next"
4. Capability config:
   - **Client authentication**: OFF
   - **Authorization**: OFF
   - **Standard flow**: OFF
   - **Direct access grants**: OFF
   - Click "Next"
5. Click "Save"

### 6. Create a Test User

1. Go to **Users**
2. Click "Add user"
3. Fill in:
   - **Username**: `testuser`
   - **Email**: `test@example.com`
   - **First name**: `Test`
   - **Last name**: `User`
   - **Email verified**: ON
4. Click "Create"
5. Go to the **Credentials** tab
6. Click "Set password"
7. Enter password: `password` (or your choice)
8. Set **Temporary**: OFF
9. Click "Save"

### 7. Test the Application

1. Open http://localhost:3000
2. You should see the login page
3. Click "Sign in with Keycloak"
4. You'll be redirected to Keycloak
5. Login with:
   - **Username**: `testuser`
   - **Password**: `password`
6. You should be redirected back to the application

## Configuration

### Environment Variables

The application uses these environment variables (already configured in `docker-compose.yml`):

**Backend:**
```env
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=ipscanner
KEYCLOAK_CLIENT_ID=ipscanner-api
```

**Frontend:**
```env
REACT_APP_KEYCLOAK_URL=http://localhost:8081
REACT_APP_KEYCLOAK_REALM=ipscanner
REACT_APP_KEYCLOAK_CLIENT_ID=ipscanner-frontend
REACT_APP_REDIRECT_URI=http://localhost:3000
```

### Important Notes

1. **URL Differences**:
   - Backend uses `http://keycloak:8080` (internal Docker network)
   - Frontend uses `http://localhost:8081` (browser access)

2. **Ports**:
   - Keycloak internal: 8080
   - Keycloak external: 8081
   - API: 8080
   - Frontend: 3000

## Troubleshooting

### Keycloak Not Starting

Check logs:
```bash
docker compose logs keycloak
```

Common issues:
- Database connection failed: Wait for PostgreSQL to be healthy
- Port conflict: Another service using port 8081

### Authentication Fails

1. Check browser console for errors
2. Verify redirect URIs in Keycloak client settings
3. Check API logs:
   ```bash
   docker compose logs api
   ```

### Token Validation Fails

Check:
1. Realm name matches in all configs
2. Client IDs are correct
3. KEYCLOAK_URL is accessible from API container

### Can't Access Keycloak Admin

1. Wait 30 seconds for Keycloak to fully start
2. Check health:
   ```bash
   docker compose ps keycloak
   ```
3. Verify logs:
   ```bash
   docker compose logs keycloak
   ```

## Production Considerations

### 1. Change Default Credentials

Update in `docker-compose.yml`:
```yaml
KEYCLOAK_ADMIN: your-admin-username
KEYCLOAK_ADMIN_PASSWORD: your-secure-password
```

### 2. Enable HTTPS

1. Configure SSL certificates
2. Update `docker-compose.yml`:
   ```yaml
   KC_HOSTNAME_STRICT_HTTPS: true
   KC_HTTP_ENABLED: false
   ```

### 3. Use External Database

For production, use a managed PostgreSQL instance:
```yaml
KC_DB_URL: jdbc:postgresql://your-db-host:5432/keycloak
KC_DB_USERNAME: your-db-user
KC_DB_PASSWORD: your-db-password
```

### 4. Configure Proper Hostname

```yaml
KC_HOSTNAME: auth.yourdomain.com
KC_HOSTNAME_PORT: 443
KC_HOSTNAME_STRICT: true
```

### 5. Backup Strategy

Backup the Keycloak database regularly:
```bash
docker compose exec postgres pg_dump -U postgres keycloak > keycloak-backup.sql
```

## Advanced Configuration

### Email Verification

1. In Keycloak Admin, go to **Realm Settings** → **Email**
2. Configure SMTP settings
3. Enable "Email verification" in **Realm Settings** → **Login**

### Two-Factor Authentication

1. Go to **Realm Settings** → **Authentication**
2. Configure OTP (One-Time Password)
3. Users can set up 2FA in their account settings

### Custom Themes

1. Create custom theme directory
2. Mount in `docker-compose.yml`:
   ```yaml
   volumes:
     - ./keycloak-theme:/opt/keycloak/themes/custom
   ```

### Social Login (Google, GitHub, etc.)

1. Go to **Identity Providers**
2. Click on the provider you want to add
3. Configure client ID and secret from the provider

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. Access http://localhost:3000
       │
┌──────▼──────────┐
│    Frontend     │ (React + OIDC)
│  localhost:3000 │
└──────┬──────────┘
       │
       │ 2. Redirect to Keycloak
       │
┌──────▼───────────┐
│    Keycloak      │
│  localhost:8081  │
└──────┬───────────┘
       │
       │ 3. Return JWT token
       │
┌──────▼──────────┐
│    Frontend     │
└──────┬──────────┘
       │
       │ 4. API calls with Bearer token
       │
┌──────▼──────────┐
│   Backend API   │ (Go + JWT validation)
│  localhost:8080 │
└──────┬──────────┘
       │
       │ 5. Validate token with JWKS
       │
┌──────▼───────────┐
│    Keycloak      │
│  (JWKS endpoint) │
└──────────────────┘
```

## API Endpoints

### Keycloak Endpoints

- **Admin Console**: http://localhost:8081/admin
- **Realm**: http://localhost:8081/realms/ipscanner
- **OIDC Configuration**: http://localhost:8081/realms/ipscanner/.well-known/openid-configuration
- **JWKS**: http://localhost:8081/realms/ipscanner/protocol/openid-connect/certs
- **Token**: http://localhost:8081/realms/ipscanner/protocol/openid-connect/token

### Application Endpoints

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api/v1
- **Backend Direct**: http://localhost:8080/api/v1 (requires auth)

## Support

For issues or questions:
1. Check the logs: `docker compose logs`
2. Verify configuration in Keycloak Admin Console
3. Test token manually using curl or Postman
4. Check network connectivity between containers

## Additional Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OIDC Specification](https://openid.net/connect/)
- [react-oidc-context Documentation](https://github.com/authts/react-oidc-context)
