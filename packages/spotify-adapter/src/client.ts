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
  return {
    getCurrentPlayback: async () => null,
    getRecentlyPlayed: async () => [],
    addToQueue: async (_spotifyTrackUri: string) => {},
  };
}
