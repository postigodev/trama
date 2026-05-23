import { refreshAccessToken, type SpotifyAuthConfig } from '@trama/spotify-adapter';
import {
  getSpotifyTokenStatusFromTauri,
  loadSpotifyTokenFromTauri,
  saveSpotifyTokenInTauri,
  type TauriSpotifyCachedToken,
} from '@/services/tauriSpotifyAuthCommands';
import { loadSpotifyLabSettings } from '@/services/spotifyLabSettings';

const defaultRedirectUri =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ??
  'http://127.0.0.1:5173/auth/spotify/callback';

export function getSpotifyRuntimeConfig(): SpotifyAuthConfig {
  const storedSettings = loadSpotifyLabSettings();

  return {
    clientId: storedSettings.clientId ?? import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '',
    redirectUri: storedSettings.redirectUri ?? defaultRedirectUri,
  };
}

export async function loadUsableSpotifyToken(): Promise<TauriSpotifyCachedToken> {
  const config = getSpotifyRuntimeConfig();
  const cached = await loadSpotifyTokenFromTauri();
  if (!cached) {
    throw new Error('Spotify is not connected. Authenticate first.');
  }

  if (!isTokenExpired(cached.expiresAt)) {
    return cached;
  }

  if (!cached.refreshToken) {
    throw new Error('Spotify session expired. Re-authenticate Spotify to continue.');
  }

  if (config.clientId.trim().length === 0 || config.redirectUri.trim().length === 0) {
    throw new Error('Spotify client ID and redirect URI are required to refresh the session.');
  }

  const refreshed = await refreshAccessToken({
    ...config,
    refreshToken: cached.refreshToken,
  });
  const savedAt = new Date();
  const expiresAt = new Date(
    savedAt.getTime() + refreshed.expiresIn * 1000
  ).toISOString();
  const tokenToSave = {
    accessToken: refreshed.accessToken,
    tokenType: refreshed.tokenType,
    expiresAt,
    refreshToken: refreshed.refreshToken ?? cached.refreshToken,
    scope: refreshed.scope ?? cached.scope,
    savedAt: savedAt.toISOString(),
  };

  await saveSpotifyTokenInTauri(tokenToSave);
  return tokenToSave;
}

export async function getSpotifyConnectionReady(): Promise<boolean> {
  const status = await getSpotifyTokenStatusFromTauri();
  return status.authenticated;
}

function isTokenExpired(expiresAt: string): boolean {
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) {
    return true;
  }

  return expiry - Date.now() <= 60_000;
}
