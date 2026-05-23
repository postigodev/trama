import { describe, expect, it } from 'vitest';
import {
  loadSpotifyLabSettings,
  saveSpotifyLabSettings,
} from './spotifyLabSettings';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('@trama/desktop - spotify lab settings', () => {
  it('saves trimmed client and redirect values', () => {
    const storage = new MemoryStorage();

    saveSpotifyLabSettings(
      {
        clientId: '  client-id  ',
        redirectUri: '  http://127.0.0.1:5173/auth/spotify/callback  ',
      },
      storage
    );

    expect(storage.getItem('trama.spotifyLabSettings')).toBe(
      JSON.stringify({
        clientId: 'client-id',
        redirectUri: 'http://127.0.0.1:5173/auth/spotify/callback',
      })
    );
  });

  it('loads stored values when the payload is valid JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'trama.spotifyLabSettings',
      JSON.stringify({
        clientId: 'client-id',
        redirectUri: 'http://127.0.0.1:5173/auth/spotify/callback',
      })
    );

    expect(loadSpotifyLabSettings(storage)).toEqual({
      clientId: 'client-id',
      redirectUri: 'http://127.0.0.1:5173/auth/spotify/callback',
    });
  });

  it('ignores invalid JSON safely', () => {
    const storage = new MemoryStorage();
    storage.setItem('trama.spotifyLabSettings', '{broken-json');

    expect(loadSpotifyLabSettings(storage)).toEqual({});
  });
});
