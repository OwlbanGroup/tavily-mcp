import axios from "axios";
import { getJpmOAuthConfig, validateJpmOAuthConfig } from "./config.js";

export interface OAuthStartResult {
  authUrl: string;
  state: string;
  missingEnv: string[];
}

export interface OAuthTokenResult {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  missingEnv?: string[];
  message?: string;
}

export function generateState(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOAuthStartUrl(state?: string): OAuthStartResult {
  const cfg = getJpmOAuthConfig();
  const missingEnv = validateJpmOAuthConfig(cfg);

  const oauthState = state || generateState();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: cfg.scope || "openid profile accounts payments",
    state: oauthState
  });

  return {
    authUrl: `${cfg.authUrl}?${params.toString()}`,
    state: oauthState,
    missingEnv
  };
}

export async function exchangeAuthorizationCode(code: string): Promise<OAuthTokenResult> {
  const cfg = getJpmOAuthConfig();
  const missingEnv = validateJpmOAuthConfig(cfg);

  if (missingEnv.length > 0) {
    return {
      missingEnv,
      message: "Missing required JPM OAuth environment variables."
    };
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret
  });

  const response = await axios.post(cfg.tokenUrl, body.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  return response.data as OAuthTokenResult;
}
