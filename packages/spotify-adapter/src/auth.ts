/**
 * Spotify OAuth PKCE authentication
 */

export interface SpotifyAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}

export function generateAuthorizationUrl(_config: SpotifyAuthConfig): string {
  // Placeholder for OAuth URL generation
  return '';
}

export async function exchangeCode(
  _code: string,
  _config: SpotifyAuthConfig
): Promise<string> {
  // Placeholder for token exchange
  return '';
}
