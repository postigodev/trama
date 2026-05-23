import {
  createSession,
  deriveSessionFromEvents,
  type FeedbackEvent,
  type FeedbackType,
  type PlayEvent,
  type PlayEventType,
  type RankedCandidate,
  type Session,
  type Track,
} from '@trama/core';
import type { TramaRepositories } from '@trama/db';
import type { PlaybackEvent } from '@/services/playbackEvents';

export interface LocalSessionRecorderOptions {
  repositories: TramaRepositories;
  sessionId: string;
}

export interface RecordFeedbackInput {
  trackId: string;
  type: FeedbackType;
  occurredAtMs?: number;
  note?: string;
}

export interface RecordFeedbackResult {
  session: Session;
  feedbackEvent: FeedbackEvent;
}

export interface RecordAutopilotChangeResult {
  session: Session;
  playEvent: PlayEvent;
}

export interface RecordCandidateQueuedInput {
  candidate: RankedCandidate;
  occurredAtMs?: number;
}

export interface RecordCandidateQueuedResult {
  session: Session;
  playEvent: PlayEvent;
}

const persistedEventTypes = new Set<PlaybackEvent['type']>([
  'track_started',
  'track_completed',
  'track_skipped',
  'track_replayed',
  'track_paused',
  'track_resumed',
]);

export class LocalSessionRecorder {
  constructor(private readonly options: LocalSessionRecorderOptions) {}

  async hydratePersistedState(): Promise<{
    session: Session | null;
    playbackEvents: PlaybackEvent[];
  }> {
    const session = await this.getSession();
    const playEvents =
      await this.options.repositories.events.listPlayEventsForSession(
        this.options.sessionId
      );
    const trackMap = await this.loadTrackMap(playEvents, []);

    return {
      session,
      playbackEvents: playEvents
        .map(event => buildPlaybackEventFromPlayEvent(event, trackMap.get(event.trackId ?? '')))
        .filter((event): event is PlaybackEvent => Boolean(event))
        .sort((left, right) => right.observedAtMs - left.observedAtMs)
        .slice(0, 12),
    };
  }

  async recordEvents(events: PlaybackEvent[]): Promise<Session> {
    const baseSession = await this.ensureSession(events[0]?.observedAtMs);

    for (const event of events) {
      const track = buildTrackFromPlaybackEvent(event);
      const playEvent = buildPlayEventFromPlaybackEvent(
        this.options.sessionId,
        event,
        track
      );

      if (!track || !playEvent) {
        continue;
      }

      await this.options.repositories.tracks.upsert(track);
      await this.options.repositories.events.appendPlayEvent(playEvent);
    }

    return this.deriveAndPersistSession(baseSession);
  }

  async recordFeedback(
    input: RecordFeedbackInput
  ): Promise<RecordFeedbackResult> {
    const occurredAtMs = input.occurredAtMs ?? Date.now();
    const baseSession = await this.ensureSession(occurredAtMs);
    const feedbackEvent = buildFeedbackEvent(
      this.options.sessionId,
      input,
      occurredAtMs
    );

    await this.options.repositories.events.appendFeedbackEvent(feedbackEvent);
    const session = await this.deriveAndPersistSession(baseSession);

    return {
      session,
      feedbackEvent,
    };
  }

  async recordAutopilotChange(
    enabled: boolean,
    occurredAtMs = Date.now()
  ): Promise<RecordAutopilotChangeResult> {
    const baseSession = await this.ensureSession(occurredAtMs);
    const playEvent = buildAutopilotEvent(
      this.options.sessionId,
      enabled,
      occurredAtMs
    );

    await this.options.repositories.events.appendPlayEvent(playEvent);
    const session = await this.deriveAndPersistSession(baseSession);

    return {
      session,
      playEvent,
    };
  }

  async recordCandidateQueued(
    input: RecordCandidateQueuedInput
  ): Promise<RecordCandidateQueuedResult> {
    const occurredAtMs = input.occurredAtMs ?? Date.now();
    const baseSession = await this.ensureSession(occurredAtMs);
    const playEvent = buildCandidateQueuedEvent(
      this.options.sessionId,
      input.candidate,
      occurredAtMs
    );

    await this.options.repositories.tracks.upsert(input.candidate.track);
    await this.options.repositories.events.appendPlayEvent(playEvent);
    const session = await this.deriveAndPersistSession(baseSession);

    return {
      session,
      playEvent,
    };
  }

  async getSession(): Promise<Session | null> {
    return this.options.repositories.sessions.findById(this.options.sessionId);
  }

  private async ensureSession(observedAtMs?: number): Promise<Session> {
    const existing = await this.options.repositories.sessions.findById(
      this.options.sessionId
    );

    if (existing) return existing;

    return this.options.repositories.sessions.create({
      session: createSession(
        this.options.sessionId,
        observedAtMs ? new Date(observedAtMs) : new Date()
      ),
    });
  }

  private async deriveAndPersistSession(baseSession: Session): Promise<Session> {
    const playEvents =
      await this.options.repositories.events.listPlayEventsForSession(
        this.options.sessionId
      );
    const feedbackEvents =
      await this.options.repositories.events.listFeedbackEventsForSession(
        this.options.sessionId
      );
    const trackMap = await this.loadTrackMap(playEvents, feedbackEvents);
    const session = deriveSessionFromEvents({
      baseSession,
      playEvents,
      feedbackEvents,
      getTrack: trackId => trackMap.get(trackId),
    });

    return this.options.repositories.sessions.update(session);
  }

  private async loadTrackMap(
    playEvents: PlayEvent[],
    feedbackEvents: FeedbackEvent[]
  ): Promise<Map<string, Track>> {
    const trackIds = new Set<string>();

    for (const event of playEvents) {
      if (event.trackId) trackIds.add(event.trackId);
    }

    for (const event of feedbackEvents) {
      const trackId = event.trackId ?? event.candidateTrackId;
      if (trackId) trackIds.add(trackId);
    }

    const tracks = await this.options.repositories.tracks.findManyByIds([
      ...trackIds,
    ]);

    return new Map(tracks.map(track => [track.id, track]));
  }
}

export function createLocalSessionRecorder(
  options: LocalSessionRecorderOptions
): LocalSessionRecorder {
  return new LocalSessionRecorder(options);
}

function buildTrackFromPlaybackEvent(event: PlaybackEvent): Track | null {
  if (!event.title) return null;

  const trackId = buildLocalTrackId(event);
  const artistName = event.artist ?? 'Unknown artist';
  const artistId = buildLocalId('artist', artistName);

  return {
    id: trackId,
    providerIds: {},
    title: event.title,
    artists: [{ id: artistId, name: artistName }],
    durationMs: event.durationMs ?? 0,
    source: 'provider_current_playback',
  };
}

function buildPlayEventFromPlaybackEvent(
  sessionId: string,
  event: PlaybackEvent,
  track: Track | null
): PlayEvent | null {
  if (!persistedEventTypes.has(event.type) || !track) {
    return null;
  }

  return {
    id: buildPlayEventId(sessionId, event, track.id),
    sessionId,
    trackId: track.id,
    providerName: 'local',
    providerPlaybackId: event.sourceAppId,
    type: event.type as PlayEventType,
    occurredAt: new Date(event.observedAtMs).toISOString(),
    progressMs: event.progressMs,
    durationMs: event.durationMs,
    inferred: true,
    confidence: event.confidence,
    metadata: {
      source: event.source,
      sourceAppId: event.sourceAppId,
      sourceLabel: event.sourceLabel,
    },
  };
}

function buildPlayEventId(
  sessionId: string,
  event: PlaybackEvent,
  trackId: string
): string {
  return buildLocalId(
    'event',
    [sessionId, event.type, trackId, String(event.observedAtMs)].join('|')
  );
}

function buildFeedbackEvent(
  sessionId: string,
  input: RecordFeedbackInput,
  occurredAtMs: number
): FeedbackEvent {
  return {
    id: buildLocalId(
      'feedback',
      [sessionId, input.trackId, input.type, String(occurredAtMs)].join('|')
    ),
    sessionId,
    trackId: input.trackId,
    type: input.type,
    occurredAt: new Date(occurredAtMs).toISOString(),
    note: input.note,
    metadata: {
      source: 'desktop_lab',
    },
  };
}

function buildAutopilotEvent(
  sessionId: string,
  enabled: boolean,
  occurredAtMs: number
): PlayEvent {
  const type: PlayEventType = enabled
    ? 'autopilot_enabled'
    : 'autopilot_disabled';

  return {
    id: buildLocalId(
      'event',
      [sessionId, type, String(occurredAtMs)].join('|')
    ),
    sessionId,
    type,
    occurredAt: new Date(occurredAtMs).toISOString(),
    inferred: false,
    confidence: 1,
    metadata: {
      source: 'desktop_lab',
    },
  };
}

function buildCandidateQueuedEvent(
  sessionId: string,
  candidate: RankedCandidate,
  occurredAtMs: number
): PlayEvent {
  return {
    id: buildLocalId(
      'event',
      [sessionId, 'candidate_queued', candidate.track.id, String(occurredAtMs)].join(
        '|'
      )
    ),
    sessionId,
    trackId: candidate.track.id,
    providerName: candidate.track.providerIds.spotify ? 'spotify' : undefined,
    providerPlaybackId: candidate.track.providerIds.spotify,
    type: 'candidate_queued',
    occurredAt: new Date(occurredAtMs).toISOString(),
    inferred: false,
    confidence: 1,
    metadata: {
      source: 'desktop_up_next',
      rank: candidate.rank,
      score: candidate.score,
      reasons: candidate.reasons.map(reason => reason.type),
      warnings: candidate.warnings.map(warning => warning.type),
    },
  };
}

function buildLocalTrackId(event: PlaybackEvent): string {
  return buildLocalId(
    'track',
    [event.sourceAppId ?? event.source, event.title ?? '', event.artist ?? ''].join(
      '|'
    )
  );
}

function buildLocalId(prefix: string, value: string): string {
  return `${prefix}_${hashString(value)}`;
}

function buildPlaybackEventFromPlayEvent(
  event: PlayEvent,
  track?: Track
): PlaybackEvent | null {
  const playbackEventType = mapPlayEventTypeToPlaybackEventType(event.type);
  if (!playbackEventType) {
    return null;
  }

  const metadata = event.metadata ?? {};
  const sourceLabel =
    typeof metadata.sourceLabel === 'string'
      ? metadata.sourceLabel
      : guessSourceLabel(
          typeof metadata.sourceAppId === 'string' ? metadata.sourceAppId : undefined
        );

  return {
    id: event.id,
    type: playbackEventType,
    title: track?.title,
    artist: track?.artists.map(artist => artist.name).join(', '),
    source:
      typeof metadata.source === 'string'
        ? (metadata.source as PlaybackEvent['source'])
        : undefined,
    sourceAppId:
      typeof metadata.sourceAppId === 'string' ? metadata.sourceAppId : undefined,
    sourceLabel,
    progressMs: event.progressMs,
    durationMs: event.durationMs ?? track?.durationMs,
    confidence: event.confidence ?? 0.75,
    observedAtMs: Date.parse(event.occurredAt),
    summary: buildPlaybackEventSummary(playbackEventType, track, event),
  };
}

function mapPlayEventTypeToPlaybackEventType(
  type: PlayEventType
): PlaybackEvent['type'] | null {
  switch (type) {
    case 'track_started':
    case 'track_completed':
    case 'track_skipped':
    case 'track_replayed':
    case 'track_paused':
    case 'track_resumed':
      return type;
    default:
      return null;
  }
}

function buildPlaybackEventSummary(
  type: PlaybackEvent['type'],
  track: Track | undefined,
  event: PlayEvent
): string {
  const title = track?.title ?? 'current track';
  const artist = track?.artists[0]?.name ? ` by ${track.artists[0].name}` : '';

  switch (type) {
    case 'track_started':
      return `Started ${title}${artist}.`;
    case 'track_completed':
      return `Completed ${title}${formatProgress(event)}.`;
    case 'track_skipped':
      return `Skipped ${title}${formatProgress(event)}.`;
    case 'track_replayed':
      return `Replayed ${title}.`;
    case 'track_paused':
      return `Paused ${title}.`;
    case 'track_resumed':
      return `Resumed ${title}.`;
    default:
      return title;
  }
}

function formatProgress(event: PlayEvent): string {
  if (
    typeof event.progressMs !== 'number' ||
    typeof event.durationMs !== 'number'
  ) {
    return '';
  }

  return ` at ${formatDuration(event.progressMs)} / ${formatDuration(
    event.durationMs
  )}`;
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function guessSourceLabel(sourceAppId?: string): string {
  if (sourceAppId?.toLowerCase().includes('spotify')) {
    return 'Spotify';
  }

  return 'Local persistence';
}

function hashString(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}
