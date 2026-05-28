import { describe, expect, it } from 'vitest';
import type { RankedCandidate } from '@trama/core';
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

function rankedCandidate(trackId: string): RankedCandidate {
  return {
    rank: 1,
    score: 0.82,
    generatedAt: '2026-01-01T00:00:00.000Z',
    track: {
      id: trackId,
      providerIds: { spotify: `spotify:track:${trackId}` },
      title: 'Candidate Track',
      artists: [{ id: 'artist-candidate', name: 'Candidate Artist' }],
      durationMs: 180000,
    },
    scoreBreakdown: {
      total: 0.82,
      components: {
        sessionSimilarity: { raw: 1, weight: 0.3, contribution: 0.3 },
        artistAffinity: { raw: 0, weight: 0.15, contribution: 0 },
        playlistAffinity: { raw: 1, weight: 0.15, contribution: 0.15 },
        completionAffinity: { raw: 0, weight: 0.15, contribution: 0 },
        explicitFeedback: { raw: 0, weight: 0.16, contribution: 0 },
        novelty: { raw: 0.6, weight: 0.03, contribution: 0.018 },
        mainstream: { raw: 0, weight: 0.025, contribution: 0 },
        skipRisk: { raw: 0, weight: -0.25, contribution: 0 },
        recentRepeatRisk: { raw: 0, weight: -0.15, contribution: 0 },
        moodBreakRisk: { raw: 0, weight: -0.175, contribution: 0 },
      },
    },
    reasons: [],
    warnings: [],
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

  it('hydrates persisted timeline events from repository state', async () => {
    const repositories = createInMemoryRepositories();
    const recorder = createLocalSessionRecorder({
      repositories,
      sessionId: 'session-1',
    });

    await recorder.recordEvents([
      playbackEvent({ type: 'track_started' }),
      playbackEvent({
        id: 'event-2',
        type: 'track_skipped',
        progressMs: 22000,
        observedAtMs: 1770000005000,
      }),
    ]);

    const hydrated = await recorder.hydratePersistedState();

    expect(hydrated.session?.skippedTrackIds).toHaveLength(1);
    expect(hydrated.playbackEvents.map(event => event.type)).toEqual([
      'track_skipped',
      'track_started',
    ]);
    expect(hydrated.playbackEvents[0]?.sourceLabel).toBe('Spotify');
  });

  it('records feedback events and updates session controls', async () => {
    const repositories = createInMemoryRepositories();
    const recorder = createLocalSessionRecorder({
      repositories,
      sessionId: 'session-1',
    });

    const initialSession = await recorder.recordEvents([
      playbackEvent({ type: 'track_started' }),
    ]);
    const result = await recorder.recordFeedback({
      trackId: initialSession.currentTrackId!,
      type: 'broke_the_mood',
      occurredAtMs: 1770000010000,
    });
    const feedbackEvents =
      await repositories.events.listFeedbackEventsForSession('session-1');

    expect(feedbackEvents).toHaveLength(1);
    expect(result.session.feedbackByTrack[initialSession.currentTrackId!]).toEqual([
      'broke_the_mood',
    ]);
    expect(result.session.controls.moodStrictness).toBeCloseTo(0.8);
  });

  it('records autopilot state changes as play events', async () => {
    const repositories = createInMemoryRepositories();
    const recorder = createLocalSessionRecorder({
      repositories,
      sessionId: 'session-1',
    });

    const result = await recorder.recordAutopilotChange(true, 1770000015000);
    const events = await repositories.events.listPlayEventsForSession(
      'session-1'
    );

    expect(events.at(-1)?.type).toBe('autopilot_enabled');
    expect(result.session.controls.autopilotEnabled).toBe(true);
  });

  it('records queued candidates as play events and recent session state', async () => {
    const repositories = createInMemoryRepositories();
    const recorder = createLocalSessionRecorder({
      repositories,
      sessionId: 'session-1',
    });

    const result = await recorder.recordCandidateQueued({
      candidate: rankedCandidate('track-queued'),
      occurredAtMs: 1770000020000,
    });
    const events = await repositories.events.listPlayEventsForSession(
      'session-1'
    );

    expect(events.at(-1)?.type).toBe('candidate_queued');
    expect(events.at(-1)?.providerPlaybackId).toBe('spotify:track:track-queued');
    expect(events.at(-1)?.metadata?.source).toBe('desktop_up_next');
    expect(result.session.recentTrackIds[0]).toBe('track-queued');
  });

  it('records autopilot queue actions with autopilot metadata', async () => {
    const repositories = createInMemoryRepositories();
    const recorder = createLocalSessionRecorder({
      repositories,
      sessionId: 'session-1',
    });

    const result = await recorder.recordCandidateQueued({
      candidate: rankedCandidate('track-autopilot'),
      occurredAtMs: 1770000025000,
      source: 'desktop_autopilot',
    });

    expect(result.playEvent.metadata?.source).toBe('desktop_autopilot');
  });
});
