# Azure SSO Authentication Setup Guide

This guide will help you configure Azure AD Single Sign-On authentication for the IP Scanner application.

## Prerequisites

- Azure account with appropriate permissions to create app registrations
- Your Azure AD Tenant ID and Client ID from the app registration you created

## Azure AD App Registration Configuration

### 1. Create or Update Your Azure AD App Registration

If you haven't already created an Azure AD app registration, follow these steps:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** or **Microsoft Entra ID**
3. Click **App registrations** → **New registration**

Configure the following:

- **Name**: IP Scanner (or your preferred name)
- **Supported account types**:
  - "Accounts in this organizational directory only" (recommended for enterprise)
  - Or choose another option based on your needs
- **Redirect URI**:
  - Platform: **Single-page application (SPA)**
  - URI: `http://localhost:3000` (for local development)

4. Click **Register**

### 2. Note Your Configuration Values

After registration, copy these values from the **Overview** page:

- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 3. Configure API Permissions

1. Click **API permissions** in the left menu
2. The default **User.Read** permission should already be present
3. If not, click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
4. Add **User.Read** permission
5. Click **Grant admin consent** (if you have admin privileges)

### 4. Configure Token Configuration (Optional but Recommended)

1. Click **Token configuration** in the left menu
2. Click **Add optional claim**
3. Select **ID** token type
4. Check the following claims:
   - `email`
   - `preferred_username`
5. Click **Add**

### 5. Configure Redirect URIs for Production

When deploying to production:

1. Click **Authentication** in the left menu
2. Under **Single-page application** section, add your production URL:
   - `https://your-production-domain.com`
3. Click **Save**

## Environment Configuration

### 1. Create a `.env` File

Copy the example environment file and fill in your Azure AD values:

```bash
cp .env.example .env
```

Edit `.env` and set the following variables:

```bash
# Azure AD Configuration
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here

# Optional: Frontend configuration (defaults shown)
REACT_APP_REDIRECT_URI=http://localhost:3000
REACT_APP_API_URL=http://localhost:8080/api/v1
```

### 2. Environment Variables Explained

#### Backend Environment Variables (Required):
- `AZURE_TENANT_ID`: Your Azure AD tenant ID (from app registration)
- `AZURE_CLIENT_ID`: Your Azure AD application (client) ID (from app registration)

#### Frontend Environment Variables:
- `AZURE_CLIENT_ID`: Same as backend (automatically set from your .env file)
- `AZURE_TENANT_ID`: Same as backend (automatically set from your .env file)
- `REACT_APP_REDIRECT_URI`: The redirect URI for authentication (default: http://localhost:3000)
- `REACT_APP_API_URL`: The backend API URL (default: http://localhost:8080/api/v1)

## Running the Application

### 1. Start the Application with Docker Compose

```bash
docker-compose up --build
```

This will:
- Build the frontend with Azure AD configuration
- Build the backend with JWT validation
- Start all services (database, API, frontend)

### 2. Access the Application

Open your browser and navigate to:
- Frontend: http://localhost:3000
- API: http://localhost:8080

### 3. Sign In

1. You'll be presented with a login screen
2. Click **Sign in with Microsoft**
3. A popup window will open for Azure AD authentication
4. Sign in with your Azure AD account
5. Grant consent to the requested permissions
6. You'll be redirected back to the application

## Authentication Flow

### How It Works

1. **Frontend Authentication**:
   - User clicks "Sign in with Microsoft"
   - MSAL library opens Azure AD login popup
   - User authenticates and grants consent
   - Azure AD returns an ID token and access token
   - Frontend stores tokens in session storage

2. **API Authentication**:
   - Frontend includes the access token in the `Authorization` header for all API requests
   - Backend middleware validates the JWT token:
     - Fetches Azure AD public keys (JWKS)
     - Verifies token signature
     - Validates token issuer and expiration
   - If valid, request proceeds; if invalid, returns 401 Unauthorized

3. **User Session**:
   - Tokens are stored in session storage (cleared when browser closes)
   - MSAL automatically refreshes tokens when they expire
   - User can sign out using the logout button

## Troubleshooting

### "Invalid client" error
- Verify your `AZURE_CLIENT_ID` matches the Application (client) ID in Azure Portal
- Ensure the redirect URI in Azure matches `http://localhost:3000`

### "Invalid issuer" error
- Verify your `AZURE_TENANT_ID` is correct
- Check that it's a valid GUID format

### CORS errors
- Ensure the frontend and backend URLs are correctly configured
- Check that the API is running on port 8080

### Token validation fails
- Ensure the backend has internet access to fetch Azure AD public keys
- Check that `AZURE_TENANT_ID` is set in the backend environment
- Verify the token hasn't expired

### "Authorization header required" on API calls
- Check browser console for errors in token acquisition
- Ensure the user is logged in
- Verify the API client is correctly sending tokens

## Production Deployment

### Additional Configuration for Production

1. **Update Redirect URIs** in Azure AD app registration to include production URLs
2. **Update Environment Variables**:
   ```bash
   REACT_APP_REDIRECT_URI=https://your-production-domain.com
   REACT_APP_API_URL=https://api.your-production-domain.com/api/v1
   ```
3. **Enable HTTPS** - Azure AD requires HTTPS for production redirect URIs
4. **Review Token Configuration** - Consider token lifetime settings in Azure AD
5. **Set up proper CORS** - Update CORS middleware to restrict origins in production

## Security Considerations

1. **Never commit** your `.env` file to version control
2. **Use HTTPS** in production environments
3. **Rotate secrets** regularly if using client secrets (not needed for SPA flow)
4. **Review permissions** regularly in Azure AD
5. **Monitor authentication logs** in Azure AD for suspicious activity
6. **Implement rate limiting** on authentication endpoints
7. **Use secure cookie settings** if implementing server-side sessions

## Additional Resources

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Azure AD Token Reference](https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens)
