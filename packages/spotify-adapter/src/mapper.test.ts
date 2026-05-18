import { describe, expect, it } from 'vitest';
import {
  mapSpotifyPlaybackToPlaybackState,
  mapSpotifyTrackToTrack,
} from './mapper';
import type {
  SpotifyCurrentlyPlayingResponse,
  SpotifyTrackObject,
} from './types';

const spotifyTrack: SpotifyTrackObject = {
  id: 'abc123',
  name: 'Night Thread',
  uri: 'spotify:track:abc123',
  duration_ms: 214000,
  explicit: false,
  popularity: 57,
  artists: [
    {
      id: 'artist123',
      name: 'Session Cartographer',
      uri: 'spotify:artist:artist123',
    },
  ],
  album: {
    id: 'album123',
    name: 'Maps After Midnight',
    uri: 'spotify:album:album123',
    images: [
      {
        url: 'https://i.scdn.co/image/small',
        width: 64,
        height: 64,
      },
      {
        url: 'https://i.scdn.co/image/large',
        width: 640,
        height: 640,
      },
    ],
  },
};

describe('@trama/spotify-adapter - mappers', () => {
  it('maps a Spotify track into a provider-independent Trama track', () => {
    const track = mapSpotifyTrackToTrack(spotifyTrack, {
      source: 'provider_playlist',
      observedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(track).toEqual({
      id: 'track_spotify_abc123',
      providerIds: {
        spotify: 'spotify:track:abc123',
      },
      title: 'Night Thread',
      artists: [
        {
          id: 'artist_spotify_artist123',
          name: 'Session Cartographer',
          providerIds: {
            spotify: 'spotify:artist:artist123',
          },
        },
      ],
      album: {
        id: 'album_spotify_album123',
        title: 'Maps After Midnight',
        artworkUrl: 'https://i.scdn.co/image/large',
        providerIds: {
          spotify: 'spotify:album:album123',
        },
      },
      durationMs: 214000,
      popularity: 57,
      explicit: false,
      artworkUrl: 'https://i.scdn.co/image/large',
      source: 'provider_playlist',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('maps current playback into normalized playback state', () => {
    const playback: SpotifyCurrentlyPlayingResponse = {
      is_playing: true,
      item: spotifyTrack,
      progress_ms: 42000,
      device: {
        id: 'device-1',
        name: 'Desktop',
        type: 'Computer',
        is_active: true,
      },
    };

    const state = mapSpotifyPlaybackToPlaybackState(
      playback,
      '2026-01-01T00:01:00.000Z'
    );

    expect(state.providerName).toBe('spotify');
    expect(state.isPlaying).toBe(true);
    expect(state.track?.id).toBe('track_spotify_abc123');
    expect(state.track?.source).toBe('provider_current_playback');
    expect(state.progressMs).toBe(42000);
    expect(state.durationMs).toBe(214000);
    expect(state.device).toEqual({
      id: 'device-1',
      name: 'Desktop',
      type: 'Computer',
      isActive: true,
    });
  });

  it('maps null playback to a disconnected playback state without throwing', () => {
    const state = mapSpotifyPlaybackToPlaybackState(
      null,
      '2026-01-01T00:02:00.000Z'
    );

    expect(state).toEqual({
      providerName: 'spotify',
      isPlaying: false,
      track: null,
      observedAt: '2026-01-01T00:02:00.000Z',
    });
  });

  it('does not require Spotify audio features or analysis fields', () => {
    const track = mapSpotifyTrackToTrack({
      id: 'minimal',
      name: 'Minimal',
      uri: 'spotify:track:minimal',
      duration_ms: 120000,
      artists: [],
    });

    expect(track.id).toBe('track_spotify_minimal');
    expect(track.tags).toBeUndefined();
    expect(track.providerIds.spotify).toBe('spotify:track:minimal');
  });
});
