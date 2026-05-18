/**
 * Spotify -> Trama model mapping.
 */

import type { Track, TrackSource } from '../../core/src/types';
import type {
  PlaybackDevice,
  PlaybackState,
  SpotifyAlbumObject,
  SpotifyCurrentlyPlayingResponse,
  SpotifyImage,
  SpotifyPlaybackDevice,
  SpotifyTrackObject,
} from './types';

export interface SpotifyTrackMappingOptions {
  source?: TrackSource;
  observedAt?: string;
}

export function mapSpotifyTrackToTrack(
  spotifyTrack: SpotifyTrackObject,
  options: SpotifyTrackMappingOptions = {}
): Track {
  const timestamp = options.observedAt ?? new Date().toISOString();

  return {
    id: toTramaId('track', spotifyTrack.id),
    providerIds: {
      spotify: spotifyTrack.uri,
    },
    title: spotifyTrack.name,
    artists: spotifyTrack.artists.map(artist => ({
      id: toTramaId('artist', artist.id),
      name: artist.name,
      providerIds: {
        spotify: artist.uri,
      },
    })),
    album: spotifyTrack.album
      ? mapSpotifyAlbumToAlbumSummary(spotifyTrack.album)
      : undefined,
    durationMs: spotifyTrack.duration_ms,
    popularity: spotifyTrack.popularity,
    explicit: spotifyTrack.explicit,
    artworkUrl: selectLargestImage(spotifyTrack.album?.images)?.url,
    source: options.source ?? 'provider_playlist',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function mapSpotifyPlaybackToPlaybackState(
  playback: SpotifyCurrentlyPlayingResponse | null,
  observedAt = new Date().toISOString()
): PlaybackState {
  if (!playback) {
    return {
      providerName: 'spotify',
      isPlaying: false,
      track: null,
      observedAt,
    };
  }

  const track = playback.item
    ? mapSpotifyTrackToTrack(playback.item, {
        source: 'provider_current_playback',
        observedAt,
      })
    : null;

  return {
    providerName: 'spotify',
    isPlaying: playback.is_playing,
    track,
    progressMs:
      typeof playback.progress_ms === 'number' ? playback.progress_ms : undefined,
    durationMs: track?.durationMs,
    device: playback.device
      ? mapSpotifyDeviceToPlaybackDevice(playback.device)
      : undefined,
    observedAt,
  };
}

function mapSpotifyAlbumToAlbumSummary(album: SpotifyAlbumObject): Track['album'] {
  return {
    id: toTramaId('album', album.id),
    title: album.name,
    artworkUrl: selectLargestImage(album.images)?.url,
    providerIds: {
      spotify: album.uri,
    },
  };
}

function mapSpotifyDeviceToPlaybackDevice(
  device: SpotifyPlaybackDevice
): PlaybackDevice {
  return {
    id: device.id ?? undefined,
    name: device.name,
    type: device.type,
    isActive: device.is_active,
  };
}

function selectLargestImage(images?: SpotifyImage[]): SpotifyImage | undefined {
  if (!images || images.length === 0) return undefined;

  return [...images].sort((left, right) => {
    const leftPixels = (left.width ?? 0) * (left.height ?? 0);
    const rightPixels = (right.width ?? 0) * (right.height ?? 0);
    return rightPixels - leftPixels;
  })[0];
}

function toTramaId(kind: 'album' | 'artist' | 'track', spotifyId: string): string {
  return `${kind}_spotify_${spotifyId}`;
}
