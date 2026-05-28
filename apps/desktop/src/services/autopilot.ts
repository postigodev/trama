import type { RankedCandidate, Session } from '@trama/core';
import type { RecordCandidateQueuedResult } from '@/services/localSessionRecorder';
import type { ObservedPlayback } from '@/services/mediaSessionCommands';
import type { SpotifyCandidatePoolResult } from '@/services/spotifyCandidatePool';

export interface SpotifyAutopilotControllerOptions {
  buildCandidatePool: (session: Session) => Promise<SpotifyCandidatePoolResult>;
  queueSpotifyTrack: (spotifyUri: string) => Promise<void>;
  recordCandidateQueued: (
    candidate: RankedCandidate,
    occurredAtMs: number
  ) => Promise<RecordCandidateQueuedResult>;
  now?: () => number;
  progressThreshold?: number;
}

export interface SpotifyAutopilotRunInput {
  session: Session | null;
  observedPlayback: ObservedPlayback | null;
}

export interface SpotifyAutopilotRunResult {
  status:
    | 'idle'
    | 'queued'
    | 'already_queued'
    | 'cooldown'
    | 'no_candidate';
  message: string | null;
  session?: Session;
  rankedCandidates?: SpotifyCandidatePoolResult['rankedCandidates'];
  queuedTrackUris?: string[];
  sourceSummary?: SpotifyCandidatePoolResult['sourceSummary'];
  queuedCandidate?: RankedCandidate;
}

const defaultProgressThreshold = 0.7;

export class SpotifyAutopilotController {
  private handledTrackId: string | null = null;
  private cooldownUntilMs = 0;
  private consecutiveFailures = 0;

  constructor(private readonly options: SpotifyAutopilotControllerOptions) {}

  async run(
    input: SpotifyAutopilotRunInput
  ): Promise<SpotifyAutopilotRunResult> {
    const session = input.session;
    const playback = input.observedPlayback;
    const now = this.options.now?.() ?? Date.now();
    const threshold = this.options.progressThreshold ?? defaultProgressThreshold;

    if (!session?.controls.autopilotEnabled) {
      return idleResult();
    }

    if (!session.currentTrackId || !playback) {
      return idleResult();
    }

    if (!isObservedSpotifyPlayback(playback)) {
      return idleResult();
    }

    if (playback.playbackStatus !== 'playing') {
      return idleResult();
    }

    if (now < this.cooldownUntilMs) {
      return {
        status: 'cooldown',
        message: `Autopilot cooling down for ${Math.ceil(
          (this.cooldownUntilMs - now) / 1000
        )}s after a failed queue attempt.`,
      };
    }

    const progressRatio = getProgressRatio(playback);
    if (progressRatio === null || progressRatio < threshold) {
      return idleResult();
    }

    if (this.handledTrackId === session.currentTrackId) {
      return idleResult();
    }

    const pool = await this.options.buildCandidatePool(session);
    const topCandidate = pool.rankedCandidates[0];

    if (!topCandidate) {
      return {
        status: 'no_candidate',
        message: 'Autopilot found no ranked candidate to queue yet.',
        rankedCandidates: pool.rankedCandidates,
        queuedTrackUris: pool.queuedTrackUris,
        sourceSummary: pool.sourceSummary,
      };
    }

    const spotifyUri = topCandidate.track.providerIds.spotify;
    if (!spotifyUri) {
      return {
        status: 'no_candidate',
        message: `Autopilot skipped "${topCandidate.track.title}" because it has no Spotify URI.`,
        rankedCandidates: pool.rankedCandidates,
        queuedTrackUris: pool.queuedTrackUris,
        sourceSummary: pool.sourceSummary,
      };
    }

    if (pool.queuedTrackUris.includes(spotifyUri)) {
      this.handledTrackId = session.currentTrackId;
      this.resetFailures();
      return {
        status: 'already_queued',
        message: `"${topCandidate.track.title}" was already in the Spotify queue, so autopilot left it alone.`,
        rankedCandidates: pool.rankedCandidates,
        queuedTrackUris: pool.queuedTrackUris,
        sourceSummary: pool.sourceSummary,
        queuedCandidate: topCandidate,
      };
    }

    try {
      await this.options.queueSpotifyTrack(spotifyUri);
      const record = await this.options.recordCandidateQueued(topCandidate, now);
      this.handledTrackId = session.currentTrackId;
      this.resetFailures();

      return {
        status: 'queued',
        message: `Autopilot queued "${topCandidate.track.title}" from the current top pick.`,
        session: record.session,
        rankedCandidates: pool.rankedCandidates,
        queuedTrackUris: [...pool.queuedTrackUris, spotifyUri],
        sourceSummary: pool.sourceSummary,
        queuedCandidate: topCandidate,
      };
    } catch (error) {
      this.consecutiveFailures += 1;
      this.cooldownUntilMs =
        now + Math.min(60_000, this.consecutiveFailures * 10_000);

      const detail = error instanceof Error ? error.message : String(error);
      return {
        status: 'cooldown',
        message: `Autopilot queue failed. ${detail} Retrying after cooldown.`,
        rankedCandidates: pool.rankedCandidates,
        queuedTrackUris: pool.queuedTrackUris,
        sourceSummary: pool.sourceSummary,
      };
    }
  }

  private resetFailures(): void {
    this.consecutiveFailures = 0;
    this.cooldownUntilMs = 0;
  }
}

export function createSpotifyAutopilotController(
  options: SpotifyAutopilotControllerOptions
): SpotifyAutopilotController {
  return new SpotifyAutopilotController(options);
}

function getProgressRatio(playback: ObservedPlayback): number | null {
  if (
    typeof playback.positionMs !== 'number' ||
    typeof playback.durationMs !== 'number' ||
    playback.durationMs <= 0
  ) {
    return null;
  }

  return playback.positionMs / playback.durationMs;
}

function isObservedSpotifyPlayback(playback: ObservedPlayback): boolean {
  return playback.sourceAppId?.toLowerCase().includes('spotify') ?? false;
}

function idleResult(): SpotifyAutopilotRunResult {
  return {
    status: 'idle',
    message: null,
  };
}
