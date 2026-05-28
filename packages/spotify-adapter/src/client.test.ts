import { describe, expect, it, vi } from 'vitest';
import { createSpotifyClient, normalizeSpotifyTrackReference } from './client';

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

  it('adds a track URI to the Spotify queue', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await createSpotifyClient('access-token').addToQueue('spotify:track:abc123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/queue?uri=spotify%3Atrack%3Aabc123',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer access-token',
        },
      }
    );

    vi.unstubAllGlobals();
  });

  it('accepts open.spotify.com track links for queueing', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await createSpotifyClient('access-token').addToQueue(
      'https://open.spotify.com/intl-es/track/02kGOhqsrxDTAbFFSdNabc?si=xyz'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/queue?uri=spotify%3Atrack%3A02kGOhqsrxDTAbFFSdNabc',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer access-token',
        },
      }
    );

    vi.unstubAllGlobals();
  });

  it('rejects non-track queue URIs before calling Spotify', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createSpotifyClient('access-token').addToQueue('spotify:album:abc123')
    ).rejects.toThrow(
      'A Spotify track URI or open.spotify.com track link is required'
    );
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('normalizes open.spotify track links into track URIs', () => {
    expect(
      normalizeSpotifyTrackReference(
        'https://open.spotify.com/track/02kGOhqsrxDTAbFFSdNabc'
      )
    ).toBe('spotify:track:02kGOhqsrxDTAbFFSdNabc');
  });

  it('surfaces playback control recovery errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response(null, { status: 404 }))
    );

    await expect(
      createSpotifyClient('access-token').skipToNext()
    ).rejects.toThrow('Spotify has no active playback device.');

    vi.unstubAllGlobals();
  });

  it('loads recently played tracks from Spotify', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          items: [
            {
              played_at: '2026-01-01T00:00:00.000Z',
              track: {
                id: 'track-1',
                name: 'Track 1',
                uri: 'spotify:track:track-1',
                duration_ms: 180000,
                artists: [{ id: 'artist-1', name: 'Artist 1', uri: 'spotify:artist:artist-1' }],
              },
            },
          ],
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const items = await createSpotifyClient('access-token').getRecentlyPlayed(5);

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('track-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/recently-played?limit=5',
      {
        headers: {
          authorization: 'Bearer access-token',
        },
      }
    );

    vi.unstubAllGlobals();
  });

  it('loads the current Spotify queue', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          queue: [
            {
              id: 'track-queued',
              name: 'Queued Track',
              uri: 'spotify:track:track-queued',
              duration_ms: 180000,
              artists: [
                {
                  id: 'artist-queued',
                  name: 'Queued Artist',
                  uri: 'spotify:artist:artist-queued',
                },
              ],
            },
          ],
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const items = await createSpotifyClient('access-token').getQueue();

    expect(items).toHaveLength(1);
    expect(items[0]?.uri).toBe('spotify:track:track-queued');

    vi.unstubAllGlobals();
  });

  it('loads user playlists from Spotify', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          items: [
            {
              id: 'playlist-1',
              name: 'Playlist 1',
              uri: 'spotify:playlist:playlist-1',
            },
          ],
          next: null,
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const playlists = await createSpotifyClient('access-token').getCurrentUserPlaylists(5);

    expect(playlists).toHaveLength(1);
    expect(playlists[0]?.id).toBe('playlist-1');

    vi.unstubAllGlobals();
  });
});
