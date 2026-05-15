/**
 * In-memory repositories for tests and early local wiring.
 */

import type { FeedbackEvent, PlayEvent, Session, Track } from '../../core/src/types';
import type {
  CreateSessionInput,
  EventRepository,
  SessionRepository,
  TrackRepository,
  TramaRepositories,
} from './repositories';

export function createInMemoryRepositories(): TramaRepositories {
  const sessions = new InMemorySessionRepository();
  const tracks = new InMemoryTrackRepository();
  const events = new InMemoryEventRepository();

  return {
    sessions,
    tracks,
    events,
  };
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, Session>();

  async create(input: CreateSessionInput): Promise<Session> {
    const session = cloneSession(input.session);
    this.sessions.set(session.id, session);
    return cloneSession(session);
  }

  async findById(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    return session ? cloneSession(session) : null;
  }

  async getActive(): Promise<Session | null> {
    const active = [...this.sessions.values()].find(
      session => session.status === 'active'
    );
    return active ? cloneSession(active) : null;
  }

  async update(session: Session): Promise<Session> {
    const next = cloneSession(session);
    this.sessions.set(next.id, next);
    return cloneSession(next);
  }
}

export class InMemoryTrackRepository implements TrackRepository {
  private readonly tracks = new Map<string, Track>();

  async upsert(track: Track): Promise<Track> {
    const next = cloneTrack(track);
    this.tracks.set(next.id, next);
    return cloneTrack(next);
  }

  async findById(trackId: string): Promise<Track | null> {
    const track = this.tracks.get(trackId);
    return track ? cloneTrack(track) : null;
  }

  async findManyByIds(trackIds: string[]): Promise<Track[]> {
    return trackIds
      .map(trackId => this.tracks.get(trackId))
      .filter((track): track is Track => Boolean(track))
      .map(track => cloneTrack(track));
  }
}

export class InMemoryEventRepository implements EventRepository {
  private readonly playEvents: PlayEvent[] = [];
  private readonly feedbackEvents: FeedbackEvent[] = [];

  async appendPlayEvent(event: PlayEvent): Promise<PlayEvent> {
    const next = clonePlayEvent(event);
    this.playEvents.push(next);
    return clonePlayEvent(next);
  }

  async appendFeedbackEvent(event: FeedbackEvent): Promise<FeedbackEvent> {
    const next = cloneFeedbackEvent(event);
    this.feedbackEvents.push(next);
    return cloneFeedbackEvent(next);
  }

  async listPlayEventsForSession(sessionId: string): Promise<PlayEvent[]> {
    return this.playEvents
      .filter(event => event.sessionId === sessionId)
      .sort(byOccurredAt)
      .map(event => clonePlayEvent(event));
  }

  async listFeedbackEventsForSession(sessionId: string): Promise<FeedbackEvent[]> {
    return this.feedbackEvents
      .filter(event => event.sessionId === sessionId)
      .sort(byOccurredAt)
      .map(event => cloneFeedbackEvent(event));
  }
}

function byOccurredAt(
  left: { occurredAt: string },
  right: { occurredAt: string }
): number {
  return left.occurredAt.localeCompare(right.occurredAt);
}

function cloneSession(session: Session): Session {
  return {
    ...session,
    recentTrackIds: [...session.recentTrackIds],
    completedTrackIds: [...session.completedTrackIds],
    skippedTrackIds: [...session.skippedTrackIds],
    replayedTrackIds: [...session.replayedTrackIds],
    acceptedArtistIds: [...session.acceptedArtistIds],
    rejectedArtistIds: [...session.rejectedArtistIds],
    acceptedTags: [...session.acceptedTags],
    rejectedTags: [...session.rejectedTags],
    feedbackByTrack: Object.fromEntries(
      Object.entries(session.feedbackByTrack).map(([trackId, feedback]) => [
        trackId,
        [...feedback],
      ])
    ),
    controls: { ...session.controls },
  };
}

function cloneTrack(track: Track): Track {
  return {
    ...track,
    providerIds: { ...track.providerIds },
    artists: track.artists.map(artist => ({
      ...artist,
      providerIds: artist.providerIds ? { ...artist.providerIds } : undefined,
    })),
    album: track.album
      ? {
          ...track.album,
          providerIds: track.album.providerIds
            ? { ...track.album.providerIds }
            : undefined,
        }
      : undefined,
    tags: track.tags ? [...track.tags] : undefined,
  };
}

function clonePlayEvent(event: PlayEvent): PlayEvent {
  return {
    ...event,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  };
}

function cloneFeedbackEvent(event: FeedbackEvent): FeedbackEvent {
  return {
    ...event,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  };
}
