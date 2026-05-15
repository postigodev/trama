/**
 * Repository interfaces for local persistence.
 */

import type { FeedbackEvent, PlayEvent, Session, Track } from '../../core/src/types';

export interface CreateSessionInput {
  session: Session;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<Session>;
  findById(sessionId: string): Promise<Session | null>;
  getActive(): Promise<Session | null>;
  update(session: Session): Promise<Session>;
}

export interface TrackRepository {
  upsert(track: Track): Promise<Track>;
  findById(trackId: string): Promise<Track | null>;
  findManyByIds(trackIds: string[]): Promise<Track[]>;
}

export interface EventRepository {
  appendPlayEvent(event: PlayEvent): Promise<PlayEvent>;
  appendFeedbackEvent(event: FeedbackEvent): Promise<FeedbackEvent>;
  listPlayEventsForSession(sessionId: string): Promise<PlayEvent[]>;
  listFeedbackEventsForSession(sessionId: string): Promise<FeedbackEvent[]>;
}

export interface TramaRepositories {
  sessions: SessionRepository;
  tracks: TrackRepository;
  events: EventRepository;
}
