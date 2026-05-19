import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@trama/db';
import type { PlaybackEvent } from './playbackEvents';
import { createLocalSessionRecorder } from './localSessionRecorder';

function playbackEvent(input: Partial<PlaybackEvent>): PlaybackEvent {
  return {
    id: 'event-1',
    type: 'track_started',
    title: 'Track A',
    artist: 'Artist A',
    source: 'windows_media_session',
    sourceAppId: 'Spotify.exe',
    sourceLabel: 'Spotify',
    progressMs: 1000,
    durationMs: 180000,
    confidence: 0.9,
    observedAtMs: 1770000000000,
    summary: 'Started Track A by Artist A.',
    ...input,
  };
}

describe('@trama/desktop - local session recorder', () => {
  it('records playback events into the local session model', async () => {
    const repositories = createInMemoryRepositories();
    const recorder = createLocalSessionRecorder({
      repositories,
      sessionId: 'session-1',
    });

    const session = await recorder.recordEvents([
      playbackEvent({ type: 'track_started' }),
      playbackEvent({
        id: 'event-2',
        type: 'track_skipped',
        progressMs: 22000,
        observedAtMs: 1770000005000,
      }),
    ]);

    expect(session.currentTrackId).toMatch(/^track_/);
    expect(session.skippedTrackIds).toEqual([session.currentTrackId]);
    expect(session.rejectedArtistIds).toHaveLength(1);
  });

  it('does not persist observer-only events as play events', async () => {
    const repositories = createInMemoryRepositories();
    const recorder = createLocalSessionRecorder({
      repositories,
      sessionId: 'session-1',
    });

    const session = await recorder.recordEvents([
      playbackEvent({ type: 'observer_attached' }),
    ]);
    const events = await repositories.events.listPlayEventsForSession(
      'session-1'
    );

    expect(events).toEqual([]);
    expect(session.recentTrackIds).toEqual([]);
  });

  it('derives completed and replayed session state', async () => {
    const recorder = createLocalSessionRecorder({
      repositories: createInMemoryRepositories(),
      sessionId: 'session-1',
    });

    const session = await recorder.recordEvents([
      playbackEvent({ type: 'track_completed' }),
      playbackEvent({
        id: 'event-2',
        type: 'track_replayed',
        observedAtMs: 1770000005000,
      }),
    ]);

    expect(session.completedTrackIds).toHaveLength(1);
    expect(session.replayedTrackIds).toEqual(session.completedTrackIds);
    expect(session.acceptedArtistIds).toHaveLength(1);
  });
});
