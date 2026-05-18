/**
 * Playback observation helpers.
 *
 * Converts normalized Spotify playback snapshots into provider-independent
 * Trama play events. This module does not call Spotify and does not rank.
 */

import type { PlayEvent, PlayEventType } from '../../core/src/types';
import type { PlaybackState } from './types';

export interface InferPlaybackEventsInput {
  sessionId: string;
  previous: PlaybackState | null;
  current: PlaybackState;
  skipThreshold?: number;
  completionThreshold?: number;
}

const defaultSkipThreshold = 0.35;
const defaultCompletionThreshold = 0.8;

export function inferPlaybackEvents(input: InferPlaybackEventsInput): PlayEvent[] {
  const skipThreshold = input.skipThreshold ?? defaultSkipThreshold;
  const completionThreshold =
    input.completionThreshold ?? defaultCompletionThreshold;
  const previousTrackId = input.previous?.track?.id;
  const currentTrackId = input.current.track?.id;
  const events: PlayEvent[] = [];

  if (!input.previous) {
    if (input.current.isPlaying && currentTrackId) {
      events.push(
        buildEvent(input, 'track_started', currentTrackId, input.current)
      );
    }
    return events;
  }

  if (previousTrackId && !currentTrackId) {
    events.push(
      buildEvent(input, 'track_paused', previousTrackId, input.current)
    );
    return events;
  }

  if (previousTrackId && currentTrackId && previousTrackId !== currentTrackId) {
    events.push(
      buildCompletedOrSkippedEvent(
        input,
        previousTrackId,
        input.previous,
        skipThreshold,
        completionThreshold
      )
    );

    if (input.current.isPlaying) {
      events.push(
        buildEvent(input, 'track_started', currentTrackId, input.current)
      );
    }

    return events;
  }

  if (previousTrackId && currentTrackId && previousTrackId === currentTrackId) {
    if (input.previous.isPlaying && !input.current.isPlaying) {
      events.push(
        buildEvent(input, 'track_paused', currentTrackId, input.current)
      );
    }

    if (!input.previous.isPlaying && input.current.isPlaying) {
      events.push(
        buildEvent(input, 'track_resumed', currentTrackId, input.current)
      );
    }

    if (isReplay(input.previous, input.current)) {
      events.push(
        buildEvent(input, 'track_replayed', currentTrackId, input.current)
      );
    }
  }

  if (!previousTrackId && currentTrackId && input.current.isPlaying) {
    events.push(
      buildEvent(input, 'track_started', currentTrackId, input.current)
    );
  }

  return events;
}

function buildCompletedOrSkippedEvent(
  input: InferPlaybackEventsInput,
  trackId: string,
  playback: PlaybackState,
  skipThreshold: number,
  completionThreshold: number
): PlayEvent {
  const ratio = progressRatio(playback);
  const type: PlayEventType =
    ratio >= completionThreshold ? 'track_completed' : 'track_skipped';
  const confidence =
    type === 'track_completed'
      ? confidenceFromCompletion(ratio, completionThreshold)
      : confidenceFromSkip(ratio, skipThreshold);

  return buildEvent(input, type, trackId, playback, confidence);
}

function buildEvent(
  input: InferPlaybackEventsInput,
  type: PlayEventType,
  trackId: string,
  playback: PlaybackState,
  confidence = 1
): PlayEvent {
  return {
    id: buildEventId(input.sessionId, type, trackId, playback.observedAt),
    sessionId: input.sessionId,
    trackId,
    providerName: 'spotify',
    providerPlaybackId: playback.track?.providerIds.spotify,
    type,
    occurredAt: playback.observedAt,
    progressMs: playback.progressMs,
    durationMs: playback.durationMs ?? playback.track?.durationMs,
    inferred: true,
    confidence,
  };
}

function progressRatio(playback: PlaybackState): number {
  const durationMs = playback.durationMs ?? playback.track?.durationMs;
  if (!durationMs || durationMs <= 0 || typeof playback.progressMs !== 'number') {
    return 0;
  }

  return playback.progressMs / durationMs;
}

function isReplay(previous: PlaybackState, current: PlaybackState): boolean {
  if (!previous.isPlaying || !current.isPlaying) return false;
  if (typeof previous.progressMs !== 'number') return false;
  if (typeof current.progressMs !== 'number') return false;
  return previous.progressMs > 30000 && current.progressMs < 5000;
}

function confidenceFromCompletion(
  ratio: number,
  completionThreshold: number
): number {
  if (ratio >= 0.95) return 0.98;
  if (ratio >= completionThreshold) return 0.85;
  return 0.5;
}

function confidenceFromSkip(ratio: number, skipThreshold: number): number {
  if (ratio <= 0.15) return 0.95;
  if (ratio <= skipThreshold) return 0.85;
  return 0.6;
}

function buildEventId(
  sessionId: string,
  type: PlayEventType,
  trackId: string,
  observedAt: string
): string {
  return [
    'spotify',
    sessionId,
    type,
    trackId,
    observedAt.replace(/[^a-zA-Z0-9]/g, ''),
  ].join('_');
}
