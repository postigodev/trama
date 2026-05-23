/**
 * Spotify OAuth PKCE authentication helpers.
 *
 * This module builds the browser/desktop auth request and token exchange
 * payload. Token persistence and local callback listening belong to the app
 * shell, not this provider-independent adapter boundary.
 */

const spotifyAuthorizeUrl = 'https://accounts.spotify.com/authorize';
const spotifyTokenUrl = 'https://accounts.spotify.com/api/token';

export const defaultSpotifyScopes = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-recently-played',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
] as const;

export interface SpotifyAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}

export interface SpotifyAuthorizationUrlInput extends SpotifyAuthConfig {
  codeChallenge: string;
  state: string;
}

export interface SpotifyAuthorizationRequest {
  authorizeUrl: string;
  codeVerifier: string;
  state: string;
  scopes: string[];
}

export interface SpotifyTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
}

export interface SpotifyRefreshTokenInput extends SpotifyAuthConfig {
  refreshToken: string;
}

export interface TokenExchangeOptions {
  fetch?: typeof fetch;
}

interface SpotifyTokenApiResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export function statusSummary(config: SpotifyAuthConfig): string {
  if (config.clientId.trim().length === 0 || config.redirectUri.trim().length === 0) {
    return 'Spotify OAuth is not configured yet';
  }

  return 'Spotify OAuth settings are present';
}

export async function prepareAuthorizationRequest(
  config: SpotifyAuthConfig
): Promise<SpotifyAuthorizationRequest> {
  validateAuthConfig(config);

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const state = generateAuthState();
  const authorizeUrl = generateAuthorizationUrl({
    ...config,
    codeChallenge,
    state,
  });

  return {
    authorizeUrl,
    codeVerifier,
    state,
    scopes: config.scopes ?? [...defaultSpotifyScopes],
  };
}

export function generateAuthorizationUrl(
  input: SpotifyAuthorizationUrlInput
): string {
  validateAuthConfig(input);
  if (input.codeChallenge.trim().length === 0) {
    throw new Error('Spotify code challenge is required');
  }
  if (input.state.trim().length === 0) {
    throw new Error('Spotify auth state is required');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: input.codeChallenge,
    state: input.state,
    scope: (input.scopes ?? [...defaultSpotifyScopes]).join(' '),
  });

  return `${spotifyAuthorizeUrl}?${params.toString()}`;
}

export async function exchangeCode(
  codeOrCallbackUrl: string,
  config: SpotifyAuthConfig,
  codeVerifier: string,
  options: TokenExchangeOptions = {}
): Promise<SpotifyTokenResponse> {
  validateAuthConfig(config);
  if (codeVerifier.trim().length === 0) {
    throw new Error('Spotify code verifier is required');
  }

  const code = extractAuthorizationCode(codeOrCallbackUrl);
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(spotifyTokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Spotify token exchange failed with status ${response.status}`);
  }

  const token = (await response.json()) as SpotifyTokenApiResponse;

  return {
    accessToken: token.access_token,
    tokenType: token.token_type,
    expiresIn: token.expires_in,
    refreshToken: token.refresh_token,
    scope: token.scope,
  };
}

export async function refreshAccessToken(
  input: SpotifyRefreshTokenInput,
  options: TokenExchangeOptions = {}
): Promise<SpotifyTokenResponse> {
  validateAuthConfig(input);
  if (input.refreshToken.trim().length === 0) {
    throw new Error('Spotify refresh token is required');
  }

  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(spotifyTokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: input.refreshToken,
      client_id: input.clientId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Spotify token refresh failed with status ${response.status}`);
  }

  const token = (await response.json()) as SpotifyTokenApiResponse;

  return {
    accessToken: token.access_token,
    tokenType: token.token_type,
    expiresIn: token.expires_in,
    refreshToken: token.refresh_token,
    scope: token.scope,
  };
}

export function extractAuthorizationCode(codeOrCallbackUrl: string): string {
  const trimmed = codeOrCallbackUrl.trim();
  if (trimmed.length === 0) {
    throw new Error('Spotify authorization code is required');
  }

  if (!trimmed.includes('://')) {
    return trimmed;
  }

  const parsed = new URL(trimmed);
  const error = parsed.searchParams.get('error');
  if (error) {
    throw new Error(`Spotify authorization failed: ${error}`);
  }

  const code = parsed.searchParams.get('code');
  if (!code) {
    throw new Error('Spotify callback URL did not include a code');
  }

  return code;
}

export function generateCodeVerifier(byteLength = 64): string {
  const bytes = new Uint8Array(byteLength);
  getCrypto().getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function generateAuthState(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  getCrypto().getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function createCodeChallenge(codeVerifier: string): Promise<string> {
  if (codeVerifier.trim().length === 0) {
    throw new Error('Spotify code verifier is required');
  }

  const data = new TextEncoder().encode(codeVerifier);
  const digest = await getCrypto().subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function validateAuthConfig(config: SpotifyAuthConfig): void {
  if (config.clientId.trim().length === 0) {
    throw new Error('Spotify client ID is required');
  }

  if (config.redirectUri.trim().length === 0) {
    throw new Error('Spotify redirect URI is required');
  }
}

function getCrypto(): Crypto {
  if (!globalThis.crypto) {
    throw new Error('Web Crypto is required for Spotify PKCE auth');
  }

  return globalThis.crypto;
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = [...bytes].map(byte => String.fromCharCode(byte)).join('');
  const encoded = encodeBase64(binary);

  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeBase64(binary: string): string {
  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  const nodeBuffer = (
    globalThis as {
      Buffer?: {
        from(input: string, encoding: 'binary'): { toString(encoding: 'base64'): string };
      };
    }
  ).Buffer;

  if (!nodeBuffer) {
    throw new Error('Base64 encoding is unavailable in this runtime');
  }

  return nodeBuffer.from(binary, 'binary').toString('base64');
}
