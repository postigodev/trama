/**
 * Spotify API client boundary for playback and queue management.
 */

import type { SpotifyCurrentlyPlayingResponse, SpotifyTrackObject } from './types';

export interface SpotifyClient {
  getCurrentPlayback: () => Promise<SpotifyCurrentlyPlayingResponse | null>;
  getRecentlyPlayed: () => Promise<SpotifyTrackObject[]>;
  addToQueue: (spotifyTrackUri: string) => Promise<void>;
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
    addToQueue: async (_spotifyTrackUri: string) => {},
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
}
