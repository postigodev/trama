import { describe, expect, it, vi } from 'vitest';
import { createSpotifyClient } from './client';

describe('@trama/spotify-adapter - client', () => {
  it('fetches current playback with bearer auth', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_url, _init) => {
      return new Response(
        JSON.stringify({
          is_playing: true,
          item: null,
          progress_ms: 1000,
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createSpotifyClient('access-token');
    const playback = await client.getCurrentPlayback();

    expect(fetchMock).toHaveBeenCalledWith('https://api.spotify.com/v1/me/player', {
      headers: {
        authorization: 'Bearer access-token',
      },
    });
    expect(playback).toEqual({
      is_playing: true,
      item: null,
      progress_ms: 1000,
    });

    vi.unstubAllGlobals();
  });

  it('returns null when Spotify reports no active playback body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }))
    );

    await expect(createSpotifyClient('access-token').getCurrentPlayback()).resolves.toBeNull();

    vi.unstubAllGlobals();
  });

  it('rejects empty access tokens', () => {
    expect(() => createSpotifyClient('')).toThrow('Spotify access token is required');
  });
});
