/**
 * Spotify API client boundary for playback and queue management.
 */

import type { SpotifyCurrentlyPlayingResponse, SpotifyTrackObject } from './types';

export interface SpotifyClient {
  getCurrentPlayback: () => Promise<SpotifyCurrentlyPlayingResponse | null>;
  getRecentlyPlayed: () => Promise<SpotifyTrackObject[]>;
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
    getRecentlyPlayed: async () => [],
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
