/**
 * Spotify adapter-owned types.
 *
 * These are intentionally small subsets of Spotify Web API response shapes.
 * Do not export these into packages/core.
 */

import type { Track } from '../../core/src/types';

export interface SpotifyImage {
  url: string;
  height?: number | null;
  width?: number | null;
}

export interface SpotifyArtistObject {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyAlbumObject {
  id: string;
  name: string;
  uri: string;
  images?: SpotifyImage[];
  release_date?: string;
}

export interface SpotifyTrackObject {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  explicit?: boolean;
  popularity?: number;
  artists: SpotifyArtistObject[];
  album?: SpotifyAlbumObject;
  is_playable?: boolean;
}

export interface SpotifyPlaybackDevice {
  id?: string | null;
  name?: string;
  type?: string;
  is_active?: boolean;
}

export interface SpotifyCurrentlyPlayingResponse {
  is_playing: boolean;
  item?: SpotifyTrackObject | null;
  progress_ms?: number | null;
  device?: SpotifyPlaybackDevice;
  timestamp?: number;
}

export interface PlaybackDevice {
  id?: string;
  name?: string;
  type?: string;
  isActive?: boolean;
}

export interface PlaybackState {
  providerName: 'spotify';
  isPlaying: boolean;
  track: Track | null;
  progressMs?: number;
  durationMs?: number;
  device?: PlaybackDevice;
  observedAt: string;
}

export interface SpotifyRecentlyPlayedItem {
  track: SpotifyTrackObject;
  played_at: string;
}

export interface SpotifyPlaylistObject {
  id: string;
  name: string;
  uri: string;
  images?: SpotifyImage[];
}

export interface SpotifyPlaylistTrackItem {
  track?: SpotifyTrackObject | null;
}

export interface SpotifyQueueResponse {
  currently_playing?: SpotifyTrackObject | null;
  queue?: SpotifyTrackObject[];
}

export type SpotifyAdapterError =
  | 'SPOTIFY_NOT_CONNECTED'
  | 'SPOTIFY_TOKEN_EXPIRED'
  | 'SPOTIFY_PREMIUM_REQUIRED'
  | 'SPOTIFY_USER_NOT_ALLOWLISTED'
  | 'SPOTIFY_PLAYBACK_UNAVAILABLE'
  | 'SPOTIFY_NO_ACTIVE_DEVICE'
  | 'SPOTIFY_QUEUE_INSERT_FAILED'
  | 'SPOTIFY_RATE_LIMITED'
  | 'SPOTIFY_FORBIDDEN'
  | 'SPOTIFY_UNKNOWN_ERROR';
