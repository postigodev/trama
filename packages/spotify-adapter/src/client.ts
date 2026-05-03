/**
 * Spotify API client for playback and queue management
 */

export interface SpotifyClient {
  getCurrentPlayback: () => Promise<any>;
  getRecentlyPlayed: () => Promise<any[]>;
  addToQueue: (trackId: string) => Promise<void>;
}

export function createSpotifyClient(accessToken: string): SpotifyClient {
  return {
    getCurrentPlayback: async () => null,
    getRecentlyPlayed: async () => [],
    addToQueue: async (trackId: string) => {},
  };
}
