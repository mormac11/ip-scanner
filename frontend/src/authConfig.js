const keycloakUrl = process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8081';
const realm = process.env.REACT_APP_KEYCLOAK_REALM || 'ipscanner';
const clientId = process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'ipscanner-frontend';
const redirectUri = process.env.REACT_APP_REDIRECT_URI || window.location.origin;

export const oidcConfig = {
  authority: `${keycloakUrl}/realms/${realm}`,
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,
  loadUserInfo: true,
};
