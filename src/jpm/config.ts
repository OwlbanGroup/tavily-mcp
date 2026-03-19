export interface JpmOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
  scope?: string;
}

export function getJpmOAuthConfig(): JpmOAuthConfig {
  return {
    clientId: process.env.JPM_CLIENT_ID || "",
    clientSecret: process.env.JPM_CLIENT_SECRET || "",
    redirectUri: process.env.JPM_REDIRECT_URI || "",
    authUrl: process.env.JPM_AUTH_URL || "",
    tokenUrl: process.env.JPM_TOKEN_URL || "",
    apiBaseUrl: process.env.JPM_API_BASE_URL || "",
    scope: process.env.JPM_SCOPE || "openid profile accounts payments"
  };
}

export function validateJpmOAuthConfig(config: JpmOAuthConfig): string[] {
  const missing: string[] = [];

  if (!config.clientId) missing.push("JPM_CLIENT_ID");
  if (!config.clientSecret) missing.push("JPM_CLIENT_SECRET");
  if (!config.redirectUri) missing.push("JPM_REDIRECT_URI");
  if (!config.authUrl) missing.push("JPM_AUTH_URL");
  if (!config.tokenUrl) missing.push("JPM_TOKEN_URL");
  if (!config.apiBaseUrl) missing.push("JPM_API_BASE_URL");

  return missing;
}
