import {
  createSession,
  deriveSessionFromEvents,
  type PlayEvent,
  type PlayEventType,
  type Session,
  type Track,
} from '@trama/core';
import type { TramaRepositories } from '@trama/db';
import type { PlaybackEvent } from '@/services/playbackEvents';

export interface LocalSessionRecorderOptions {
  repositories: TramaRepositories;
  sessionId: string;
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
    const trackMap = await this.loadTrackMap(playEvents);
    const session = deriveSessionFromEvents({
      baseSession,
      playEvents,
      getTrack: trackId => trackMap.get(trackId),
    });

    return this.options.repositories.sessions.update(session);
  }

  private async loadTrackMap(playEvents: PlayEvent[]): Promise<Map<string, Track>> {
    const trackIds = new Set<string>();

    for (const event of playEvents) {
      if (event.trackId) trackIds.add(event.trackId);
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

function hashString(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}
