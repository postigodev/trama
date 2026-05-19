import type { ObservedPlayback } from '@/services/mediaSessionCommands';

export type PlaybackEventType =
  | 'track_started'
  | 'track_completed'
  | 'track_skipped'
  | 'track_replayed'
  | 'track_paused'
  | 'track_resumed'
  | 'track_stopped'
  | 'observer_lost';

export interface PlaybackEvent {
  id: string;
  type: PlaybackEventType;
  title?: string;
  artist?: string;
  source?: ObservedPlayback['source'];
  sourceAppId?: string;
  sourceLabel: string;
  progressMs?: number;
  durationMs?: number;
  confidence: number;
  observedAtMs: number;
  summary: string;
}

interface PlaybackEventInferenceContext {
  recentEvents?: PlaybackEvent[];
}

export function inferPlaybackEvents(
  previous: ObservedPlayback | null,
  next: ObservedPlayback | null,
  context: PlaybackEventInferenceContext = {}
): PlaybackEvent[] {
  if (!previous && !next) {
    return [];
  }

  if (previous && !next) {
    return [buildEvent('observer_lost', previous, 'Local media session disappeared.', 0.7)];
  }

  if (!next) {
    return [];
  }

  if (!previous) {
    return [buildEvent('track_started', next, describeTrackStart(next), 0.9)];
  }

  if (playbackIdentity(previous) !== playbackIdentity(next)) {
    const transitionEvents = inferTransitionEvents(previous, next);
    const startType = wasRecentlyStarted(next, context.recentEvents)
      ? 'track_replayed'
      : 'track_started';
    const startSummary =
      startType === 'track_replayed'
        ? describeReplay(next)
        : describeTrackStart(next);

    return [
      ...transitionEvents,
      buildEvent(startType, next, startSummary, startType === 'track_replayed' ? 0.75 : 0.9),
    ];
  }

  const previousStatus = previous.playbackStatus ?? 'unknown';
  const nextStatus = next.playbackStatus ?? 'unknown';

  if (previousStatus === nextStatus) {
    return [];
  }

  if (nextStatus === 'paused' && previousStatus === 'playing') {
    return [buildEvent('track_paused', next, describeStatus(next, 'Paused'), 0.95)];
  }

  if (
    nextStatus === 'playing' &&
    (previousStatus === 'paused' ||
      previousStatus === 'stopped' ||
      previousStatus === 'unknown')
  ) {
    return [buildEvent('track_resumed', next, describeStatus(next, 'Resumed'), 0.95)];
  }

  if (nextStatus === 'stopped' || nextStatus === 'closed') {
    return [buildEvent('track_stopped', next, describeStatus(next, 'Stopped'), 0.9)];
  }

  return [];
}

function buildEvent(
  type: PlaybackEventType,
  playback: ObservedPlayback,
  summary: string,
  confidence: number
): PlaybackEvent {
  return {
    id: `${type}-${playback.observedAtMs}-${playbackIdentity(playback)}`,
    type,
    title: playback.title,
    artist: playback.artist,
    source: playback.source,
    sourceAppId: playback.sourceAppId,
    sourceLabel: getPlaybackSourceLabel(playback),
    progressMs: playback.positionMs,
    durationMs: playback.durationMs,
    confidence,
    observedAtMs: playback.observedAtMs,
    summary,
  };
}

function inferTransitionEvents(
  previous: ObservedPlayback,
  next: ObservedPlayback
): PlaybackEvent[] {
  if (
    typeof previous.positionMs !== 'number' ||
    typeof previous.durationMs !== 'number' ||
    previous.durationMs <= 0
  ) {
    return [];
  }

  const progressRatio = previous.positionMs / previous.durationMs;
  const remainingMs = previous.durationMs - previous.positionMs;

  if (progressRatio >= 0.85 || remainingMs <= 15000) {
    return [
      buildEvent(
        'track_completed',
        { ...previous, observedAtMs: next.observedAtMs },
        describeTerminalEvent(previous, 'Completed'),
        progressRatio >= 0.92 ? 0.95 : 0.85
      ),
    ];
  }

  if (previous.positionMs >= 10000 && progressRatio <= 0.5) {
    return [
      buildEvent(
        'track_skipped',
        { ...previous, observedAtMs: next.observedAtMs },
        describeTerminalEvent(previous, 'Skipped'),
        progressRatio <= 0.25 ? 0.9 : 0.75
      ),
    ];
  }

  return [];
}

function playbackIdentity(playback: ObservedPlayback): string {
  return [
    playback.sourceAppId ?? playback.source,
    playback.title ?? '',
    playback.artist ?? '',
  ]
    .join('|')
    .toLocaleLowerCase();
}

function describeTrackStart(playback: ObservedPlayback): string {
  const title = playback.title ?? 'Unknown track';
  const artist = playback.artist ? ` by ${playback.artist}` : '';
  return `Started ${title}${artist}.`;
}

function describeReplay(playback: ObservedPlayback): string {
  return `Replayed ${playback.title ?? 'current track'}.`;
}

function describeStatus(playback: ObservedPlayback, action: string): string {
  return `${action} ${playback.title ?? 'current track'}.`;
}

function describeTerminalEvent(
  playback: ObservedPlayback,
  action: 'Completed' | 'Skipped'
): string {
  const progress =
    typeof playback.positionMs === 'number' && typeof playback.durationMs === 'number'
      ? ` at ${formatDuration(playback.positionMs)} / ${formatDuration(playback.durationMs)}`
      : '';

  return `${action} ${playback.title ?? 'current track'}${progress}.`;
}

function wasRecentlyStarted(
  playback: ObservedPlayback,
  recentEvents: PlaybackEvent[] = []
): boolean {
  const identity = playbackIdentity(playback);

  return recentEvents
    .filter(
      event =>
        event.type === 'track_started' || event.type === 'track_replayed'
    )
    .slice(0, 8)
    .some(event => playbackEventIdentity(event) === identity);
}

function playbackEventIdentity(event: PlaybackEvent): string {
  return [
    event.sourceAppId ?? event.source,
    event.title ?? '',
    event.artist ?? '',
  ]
    .join('|')
    .toLocaleLowerCase();
}

export function getPlaybackSourceLabel(playback: ObservedPlayback): string {
  const sourceAppId = playback.sourceAppId?.toLocaleLowerCase() ?? '';

  if (sourceAppId.includes('spotify')) {
    return 'Spotify';
  }

  if (playback.source === 'windows_media_session') {
    return 'Windows media session';
  }

  return playback.source;
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
