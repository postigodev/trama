import { describe, expect, it } from 'vitest';
import type { FeedbackEvent, Track } from '@trama/core';
import { createInMemoryRepositories } from '@trama/db';
import type { PlaybackState } from '@trama/spotify-adapter';
import { createPersonalModeLoop } from './personalModeLoop';

const trackA: Track = {
  id: 'track_spotify_a',
  title: 'Track A',
  artists: [{ id: 'artist-a', name: 'Artist A' }],
  durationMs: 180000,
  providerIds: { spotify: 'spotify:track:a' },
  tags: ['late-night', 'melodic'],
};

const trackB: Track = {
  id: 'track_spotify_b',
  title: 'Track B',
  artists: [{ id: 'artist-b', name: 'Artist B' }],
  durationMs: 200000,
  providerIds: { spotify: 'spotify:track:b' },
  tags: ['abrasive', 'bright'],
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

describe('@trama/desktop - personal mode loop', () => {
  it('creates a session, stores track metadata, and appends first playback event', async () => {
    const repositories = createInMemoryRepositories();
    const loop = createPersonalModeLoop({
      repositories,
      sessionId: 'session-1',
    });

    const result = await loop.observePlayback(
      playback({
        track: trackA,
        observedAt: '2026-01-01T00:01:00.000Z',
      })
    );
    const storedTrack = await repositories.tracks.findById('track_spotify_a');
    const events =
      await repositories.events.listPlayEventsForSession('session-1');

    expect(result.inferredEvents.map(event => event.type)).toEqual([
      'track_started',
    ]);
    expect(result.session.currentTrackId).toBe('track_spotify_a');
    expect(storedTrack?.providerIds.spotify).toBe('spotify:track:a');
    expect(events).toHaveLength(1);
  });

  it('derives completion and next start across sequential playback snapshots', async () => {
    const repositories = createInMemoryRepositories();
    const loop = createPersonalModeLoop({
      repositories,
      sessionId: 'session-1',
    });

    await loop.observePlayback(
      playback({
        track: trackA,
        progressMs: 170000,
        durationMs: 180000,
        observedAt: '2026-01-01T00:03:00.000Z',
      })
    );

    const result = await loop.observePlayback(
      playback({
        track: trackB,
        progressMs: 1000,
        durationMs: 200000,
        observedAt: '2026-01-01T00:04:00.000Z',
      })
    );

    expect(result.inferredEvents.map(event => event.type)).toEqual([
      'track_completed',
      'track_started',
    ]);
    expect(result.session.completedTrackIds).toContain('track_spotify_a');
    expect(result.session.currentTrackId).toBe('track_spotify_b');
    expect(result.session.acceptedArtistIds).toContain('artist-a');
  });

  it('records feedback events and re-derives session state', async () => {
    const repositories = createInMemoryRepositories();
    const loop = createPersonalModeLoop({
      repositories,
      sessionId: 'session-1',
    });

    await loop.observePlayback(
      playback({
        track: trackB,
        observedAt: '2026-01-01T00:01:00.000Z',
      })
    );

    const feedbackEvent: FeedbackEvent = {
      id: 'feedback-1',
      sessionId: 'session-1',
      trackId: 'track_spotify_b',
      type: 'broke_the_mood',
      occurredAt: '2026-01-01T00:02:00.000Z',
    };
    const result = await loop.recordFeedback(feedbackEvent);

    expect(result.session.feedbackByTrack['track_spotify_b']).toEqual([
      'broke_the_mood',
    ]);
    expect(result.session.rejectedArtistIds).toContain('artist-b');
    expect(result.session.controls.moodStrictness).toBeCloseTo(0.8);
  });

  it('keeps previous playback between observations', async () => {
    const repositories = createInMemoryRepositories();
    const loop = createPersonalModeLoop({
      repositories,
      sessionId: 'session-1',
    });

    expect(loop.getPreviousPlayback()).toBeNull();

    await loop.observePlayback(
      playback({
        track: trackA,
        observedAt: '2026-01-01T00:01:00.000Z',
      })
    );

    expect(loop.getPreviousPlayback()?.track?.id).toBe('track_spotify_a');
  });
});
