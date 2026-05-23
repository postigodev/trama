export interface SpotifyLabSettings {
  clientId: string;
  redirectUri: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const spotifyLabSettingsKey = 'trama.spotifyLabSettings';

export function loadSpotifyLabSettings(
  storage: StorageLike | null | undefined = getBrowserStorage()
): Partial<SpotifyLabSettings> {
  if (!storage) {
    return {};
  }

  const raw = storage.getItem(spotifyLabSettingsKey);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SpotifyLabSettings>;
    return {
      clientId: normalizeStoredValue(parsed.clientId),
      redirectUri: normalizeStoredValue(parsed.redirectUri),
    };
  } catch {
    return {};
  }
}

export function saveSpotifyLabSettings(
  settings: SpotifyLabSettings,
  storage: StorageLike | null | undefined = getBrowserStorage()
): void {
  if (!storage) {
    return;
  }

  storage.setItem(
    spotifyLabSettingsKey,
    JSON.stringify({
      clientId: settings.clientId.trim(),
      redirectUri: settings.redirectUri.trim(),
    })
  );
}

function getBrowserStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage;
}

function normalizeStoredValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
