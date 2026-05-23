/**
 * Spotify API client boundary for playback and queue management.
 */

import type {
  SpotifyCurrentlyPlayingResponse,
  SpotifyPlaylistObject,
  SpotifyPlaylistTrackItem,
  SpotifyRecentlyPlayedItem,
  SpotifyTrackObject,
} from './types';

export interface SpotifyClient {
  getCurrentPlayback: () => Promise<SpotifyCurrentlyPlayingResponse | null>;
  getRecentlyPlayed: (limit?: number) => Promise<SpotifyTrackObject[]>;
  getCurrentUserPlaylists: (limit?: number) => Promise<SpotifyPlaylistObject[]>;
  getPlaylistTracks: (
    playlistId: string,
    limit?: number
  ) => Promise<SpotifyTrackObject[]>;
  addToQueue: (spotifyTrackUriOrUrl: string) => Promise<void>;
  pausePlayback: () => Promise<void>;
  resumePlayback: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
}

export function createSpotifyClient(_accessToken: string): SpotifyClient {
  const accessToken = _accessToken.trim();
  if (accessToken.length === 0) {
    throw new Error('Spotify access token is required');
  }

  return {
    getCurrentPlayback: async () =>
      getJsonOrNull<SpotifyCurrentlyPlayingResponse>(
        'https://api.spotify.com/v1/me/player'
      ),
    getRecentlyPlayed: async (limit = 20) => {
      const response = await getJson<{
        items?: SpotifyRecentlyPlayedItem[];
      }>(
        `https://api.spotify.com/v1/me/player/recently-played?limit=${Math.min(
          Math.max(limit, 1),
          50
        )}`
      );

      return (response.items ?? [])
        .map(item => item.track)
        .filter(isSpotifyTrackObject);
    },
    getCurrentUserPlaylists: async (limit = 20) =>
      getPagedItems<SpotifyPlaylistObject>(
        `https://api.spotify.com/v1/me/playlists?limit=${Math.min(
          Math.max(limit, 1),
          50
        )}`,
        limit
      ),
    getPlaylistTracks: async (playlistId: string, limit = 25) => {
      if (playlistId.trim().length === 0) {
        throw new Error('Spotify playlist ID is required');
      }

      const items = await getPagedItems<SpotifyPlaylistTrackItem>(
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(
          playlistId
        )}/tracks?limit=${Math.min(Math.max(limit, 1), 100)}`,
        limit
      );

      return items
        .map(item => item.track)
        .filter(isSpotifyTrackObject)
        .filter(track => track.is_playable !== false);
    },
    addToQueue: async (spotifyTrackUriOrUrl: string) => {
      const uri = normalizeSpotifyTrackReference(spotifyTrackUriOrUrl);

      await requestNoContent(
        `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`,
        'POST'
      );
    },
    pausePlayback: async () => {
      await requestNoContent('https://api.spotify.com/v1/me/player/pause', 'PUT');
    },
    resumePlayback: async () => {
      await requestNoContent('https://api.spotify.com/v1/me/player/play', 'PUT');
    },
    skipToNext: async () => {
      await requestNoContent('https://api.spotify.com/v1/me/player/next', 'POST');
    },
    skipToPrevious: async () => {
      await requestNoContent(
        'https://api.spotify.com/v1/me/player/previous',
        'POST'
      );
    },
  };

  async function getJsonOrNull<T>(url: string): Promise<T | null> {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204) {
      return null;
    }

    if (response.status === 401) {
      throw new Error('Spotify access token expired or was rejected');
    }

    if (!response.ok) {
      throw new Error(`Spotify request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      throw new Error('Spotify access token expired or was rejected');
    }

    if (response.status === 403) {
      throw new Error(
        'Spotify rejected this request. Re-authenticate if additional scopes are required.'
      );
    }

    if (!response.ok) {
      throw new Error(`Spotify request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async function getPagedItems<T>(url: string, limit: number): Promise<T[]> {
    const items: T[] = [];
    let nextUrl: string | null = url;

    while (nextUrl && items.length < limit) {
      const page: {
        items?: T[];
        next?: string | null;
      } = await getJson<{
        items?: T[];
        next?: string | null;
      }>(nextUrl);

      items.push(...(page.items ?? []));
      nextUrl = page.next ?? null;
    }

    return items.slice(0, limit);
  }

  async function requestNoContent(
    url: string,
    method: 'POST' | 'PUT'
  ): Promise<void> {
    const response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      throw new Error('Spotify access token expired or was rejected');
    }

    if (response.status === 403) {
      throw new Error('Spotify rejected playback control. Premium may be required.');
    }

    if (response.status === 404) {
      throw new Error('Spotify has no active playback device.');
    }

    if (!response.ok) {
      throw new Error(`Spotify request failed with status ${response.status}`);
    }
  }
}

function isSpotifyTrackObject(
  value: SpotifyTrackObject | SpotifyPlaylistTrackItem['track'] | undefined | null
): value is SpotifyTrackObject {
  return Boolean(
    value &&
      typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      typeof value.uri === 'string'
  );
}

export function normalizeSpotifyTrackReference(input: string): string {
  const trimmed = input.trim();

  if (trimmed.startsWith('spotify:track:')) {
    return trimmed;
  }

  if (!trimmed.includes('://')) {
    throw new Error(
      'A Spotify track URI or open.spotify.com track link is required'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      'A Spotify track URI or open.spotify.com track link is required'
    );
  }

  const host = parsed.hostname.toLowerCase();
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  const trackIndex = pathParts.findIndex(part => part === 'track');
  const trackId = trackIndex >= 0 ? pathParts[trackIndex + 1] : undefined;

  if (
    (host === 'open.spotify.com' || host.endsWith('.spotify.com')) &&
    trackId
  ) {
    return `spotify:track:${trackId}`;
  }

  throw new Error(
    'A Spotify track URI or open.spotify.com track link is required'
  );
}
