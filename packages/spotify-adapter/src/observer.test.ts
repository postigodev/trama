import { describe, expect, it } from 'vitest';
import type { Track } from '../../core/src/types';
import { inferPlaybackEvents } from './observer';
import type { PlaybackState } from './types';

const trackA: Track = {
  id: 'track_spotify_a',
  title: 'Track A',
  artists: [{ id: 'artist-a', name: 'Artist A' }],
  durationMs: 180000,
  providerIds: { spotify: 'spotify:track:a' },
};

const trackB: Track = {
  id: 'track_spotify_b',
  title: 'Track B',
  artists: [{ id: 'artist-b', name: 'Artist B' }],
  durationMs: 200000,
  providerIds: { spotify: 'spotify:track:b' },
};

function playback(input: Partial<PlaybackState>): PlaybackState {
  return {
    providerName: 'spotify',
    isPlaying: true,
    track: trackA,
    progressMs: 0,
    durationMs: trackA.durationMs,
    observedAt: '2026-01-01T00:00:00.000Z',
    ...input,
  };
}

describe('@trama/spotify-adapter - playback observer', () => {
  it('emits track_started for the first observed playing track', () => {
    const events = inferPlaybackEvents({
      sessionId: 'session-1',
      previous: null,
      current: playback({
        track: trackA,
        observedAt: '2026-01-01T00:01:00.000Z',
      }),
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      sessionId: 'session-1',
      trackId: 'track_spotify_a',
      providerName: 'spotify',
      providerPlaybackId: 'spotify:track:a',
      type: 'track_started',
      occurredAt: '2026-01-01T00:01:00.000Z',
      inferred: true,
    });
  });

  it('emits track_completed and next track_started when a nearly finished track changes', () => {
    const events = inferPlaybackEvents({
      sessionId: 'session-1',
      previous: playback({
        track: trackA,
        progressMs: 170000,
        durationMs: 180000,
        observedAt: '2026-01-01T00:03:00.000Z',
      }),
      current: playback({
        track: trackB,
        progressMs: 1000,
        durationMs: 200000,
        observedAt: '2026-01-01T00:04:00.000Z',
      }),
    });

    expect(events.map(event => event.type)).toEqual([
      'track_completed',
      'track_started',
    ]);
    expect(events[0].trackId).toBe('track_spotify_a');
    expect(events[0].confidence).toBeGreaterThan(0.8);
    expect(events[1].trackId).toBe('track_spotify_b');
  });

  it('emits track_skipped when a track changes before the completion threshold', () => {
    const events = inferPlaybackEvents({
      sessionId: 'session-1',
      previous: playback({
        track: trackA,
        progressMs: 25000,
        durationMs: 180000,
        observedAt: '2026-01-01T00:02:00.000Z',
      }),
      current: playback({
        track: trackB,
        progressMs: 0,
        durationMs: 200000,
        observedAt: '2026-01-01T00:03:00.000Z',
      }),
    });

    expect(events[0]).toMatchObject({
      type: 'track_skipped',
      trackId: 'track_spotify_a',
      progressMs: 25000,
      durationMs: 180000,
    });
  });

  it('emits pause and resume events for the same track', () => {
    const pauseEvents = inferPlaybackEvents({
      sessionId: 'session-1',
      previous: playback({
        isPlaying: true,
        progressMs: 45000,
        observedAt: '2026-01-01T00:02:00.000Z',
      }),
      current: playback({
        isPlaying: false,
        progressMs: 46000,
        observedAt: '2026-01-01T00:03:00.000Z',
      }),
    });
    const resumeEvents = inferPlaybackEvents({
      sessionId: 'session-1',
      previous: playback({
        isPlaying: false,
        progressMs: 46000,
        observedAt: '2026-01-01T00:03:00.000Z',
      }),
      current: playback({
        isPlaying: true,
        progressMs: 47000,
        observedAt: '2026-01-01T00:04:00.000Z',
      }),
    });

    expect(pauseEvents.map(event => event.type)).toEqual(['track_paused']);
    expect(resumeEvents.map(event => event.type)).toEqual(['track_resumed']);
  });

  it('emits track_replayed when the same track restarts near the beginning', () => {
    const events = inferPlaybackEvents({
      sessionId: 'session-1',
      previous: playback({
        progressMs: 90000,
        observedAt: '2026-01-01T00:04:00.000Z',
      }),
      current: playback({
        progressMs: 2000,
        observedAt: '2026-01-01T00:05:00.000Z',
      }),
    });

    expect(events.map(event => event.type)).toEqual(['track_replayed']);
  });

  it('does not emit events when playback only progresses normally', () => {
    const events = inferPlaybackEvents({
      sessionId: 'session-1',
      previous: playback({
        progressMs: 30000,
        observedAt: '2026-01-01T00:02:00.000Z',
      }),
      current: playback({
        progressMs: 35000,
        observedAt: '2026-01-01T00:03:00.000Z',
      }),
    });

    expect(events).toEqual([]);
  });
});
