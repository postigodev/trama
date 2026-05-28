import { describe, expect, it, vi } from 'vitest';
import { createSession, type RankedCandidate, type Session } from '@trama/core';
import type { SpotifyCandidatePoolResult } from '@/services/spotifyCandidatePool';
import {
  createSpotifyAutopilotController,
  type SpotifyAutopilotControllerOptions,
} from './autopilot';
import type { ObservedPlayback } from './mediaSessionCommands';

function createAutopilotSession(): Session {
  const session = createSession('session-1', new Date('2026-01-01T00:00:00.000Z'));
  session.currentTrackId = 'track-current';
  session.controls.autopilotEnabled = true;
  return session;
}

function observedPlayback(
  overrides: Partial<ObservedPlayback> = {}
): ObservedPlayback {
  return {
    source: 'windows_media_session',
    sourceAppId: 'Spotify.exe',
    title: 'Current Track',
    artist: 'Current Artist',
    playbackStatus: 'playing',
    positionMs: 140_000,
    durationMs: 180_000,
    observedAtMs: 1_770_000_000_000,
    ...overrides,
  };
}

function rankedCandidate(trackId = 'track-next'): RankedCandidate {
  return {
    rank: 1,
    score: 0.91,
    generatedAt: '2026-01-01T00:00:00.000Z',
    track: {
      id: trackId,
      providerIds: { spotify: `spotify:track:${trackId}` },
      title: `Track ${trackId}`,
      artists: [{ id: `artist-${trackId}`, name: `Artist ${trackId}` }],
      durationMs: 180_000,
    },
    scoreBreakdown: {
      total: 0.91,
      components: {
        sessionSimilarity: { raw: 1, weight: 0.3, contribution: 0.3 },
        artistAffinity: { raw: 0, weight: 0.15, contribution: 0 },
        playlistAffinity: { raw: 1, weight: 0.15, contribution: 0.15 },
        completionAffinity: { raw: 0, weight: 0.15, contribution: 0 },
        explicitFeedback: { raw: 0.4, weight: 0.16, contribution: 0.064 },
        novelty: { raw: 0.5, weight: 0.03, contribution: 0.015 },
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

function candidatePoolResult(
  candidate: RankedCandidate,
  queuedTrackUris: string[] = []
): SpotifyCandidatePoolResult {
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    candidatePool: [
      {
        track: candidate.track,
        source: 'playlist_cooccurrence',
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    rankedCandidates: [candidate],
    queuedTrackUris,
    sourceSummary: {
      recentlyPlayedCount: 12,
      playlistCount: 4,
      playlistTrackCount: 30,
    },
  };
}

function buildOptions(
  overrides: Partial<SpotifyAutopilotControllerOptions> = {}
): SpotifyAutopilotControllerOptions {
  const session = createAutopilotSession();
  const topCandidate = rankedCandidate();

  return {
    buildCandidatePool: vi.fn(async () => candidatePoolResult(topCandidate)),
    queueSpotifyTrack: vi.fn(async () => undefined),
    recordCandidateQueued: vi.fn(async () => ({
      session: {
        ...session,
        recentTrackIds: [topCandidate.track.id],
      },
      playEvent: {
        id: 'event-1',
        sessionId: session.id,
        trackId: topCandidate.track.id,
        type: 'candidate_queued',
        occurredAt: '2026-01-01T00:01:00.000Z',
        inferred: false,
      },
    })),
    now: () => 1_770_000_010_000,
    ...overrides,
  };
}

describe('@trama/desktop - spotify autopilot', () => {
  it('queues the top candidate once the track is far enough along', async () => {
    const options = buildOptions();
    const controller = createSpotifyAutopilotController(options);
    const session = createAutopilotSession();

    const result = await controller.run({
      session,
      observedPlayback: observedPlayback(),
    });

    expect(result.status).toBe('queued');
    expect(options.queueSpotifyTrack).toHaveBeenCalledWith(
      'spotify:track:track-next'
    );
    expect(options.recordCandidateQueued).toHaveBeenCalledTimes(1);
    expect(result.queuedTrackUris).toContain('spotify:track:track-next');
  });

  it('does not queue before the progress threshold', async () => {
    const options = buildOptions();
    const controller = createSpotifyAutopilotController(options);

    const result = await controller.run({
      session: createAutopilotSession(),
      observedPlayback: observedPlayback({
        positionMs: 40_000,
        durationMs: 180_000,
      }),
    });

    expect(result.status).toBe('idle');
    expect(options.buildCandidatePool).not.toHaveBeenCalled();
  });

  it('does not queue when the top candidate is already in Spotify queue', async () => {
    const candidate = rankedCandidate();
    const options = buildOptions({
      buildCandidatePool: vi.fn(async () =>
        candidatePoolResult(candidate, ['spotify:track:track-next'])
      ),
    });
    const controller = createSpotifyAutopilotController(options);

    const result = await controller.run({
      session: createAutopilotSession(),
      observedPlayback: observedPlayback(),
    });

    expect(result.status).toBe('already_queued');
    expect(options.queueSpotifyTrack).not.toHaveBeenCalled();
    expect(options.recordCandidateQueued).not.toHaveBeenCalled();
  });

  it('does not queue twice for the same current track', async () => {
    const options = buildOptions();
    const controller = createSpotifyAutopilotController(options);
    const session = createAutopilotSession();

    const first = await controller.run({
      session,
      observedPlayback: observedPlayback(),
    });
    const second = await controller.run({
      session,
      observedPlayback: observedPlayback({
        observedAtMs: 1_770_000_012_000,
        positionMs: 150_000,
      }),
    });

    expect(first.status).toBe('queued');
    expect(second.status).toBe('idle');
    expect(options.queueSpotifyTrack).toHaveBeenCalledTimes(1);
  });

  it('backs off into cooldown after a queue failure', async () => {
    const options = buildOptions({
      queueSpotifyTrack: vi.fn(async () => {
        throw new Error('No active playback found.');
      }),
    });
    const controller = createSpotifyAutopilotController(options);
    const session = createAutopilotSession();

    const failed = await controller.run({
      session,
      observedPlayback: observedPlayback(),
    });
    const cooledDown = await controller.run({
      session,
      observedPlayback: observedPlayback({
        observedAtMs: 1_770_000_011_000,
      }),
    });

    expect(failed.status).toBe('cooldown');
    expect(failed.message).toContain('No active playback found.');
    expect(cooledDown.status).toBe('cooldown');
    expect(options.queueSpotifyTrack).toHaveBeenCalledTimes(1);
  });
});
