import {
  createSession,
  deriveSessionFromEvents,
  type FeedbackEvent,
  type PlayEvent,
  type Session,
  type Track,
} from '@trama/core';
import type { TramaRepositories } from '@trama/db';
import {
  inferPlaybackEvents,
  type PlaybackState,
} from '@trama/spotify-adapter';

export interface PersonalModeLoopOptions {
  repositories: TramaRepositories;
  sessionId: string;
  initialPlayback?: PlaybackState | null;
}

export interface PersonalModeLoopResult {
  session: Session;
  inferredEvents: PlayEvent[];
  playback: PlaybackState;
}

export interface PersonalModeFeedbackResult {
  session: Session;
  feedbackEvent: FeedbackEvent;
}

export class PersonalModeLoop {
  private previousPlayback: PlaybackState | null;

  constructor(private readonly options: PersonalModeLoopOptions) {
    this.previousPlayback = options.initialPlayback ?? null;
  }

  async observePlayback(playback: PlaybackState): Promise<PersonalModeLoopResult> {
    const baseSession = await this.ensureSession(playback.observedAt);

    if (playback.track) {
      await this.options.repositories.tracks.upsert(playback.track);
    }

    const inferredEvents = inferPlaybackEvents({
      sessionId: this.options.sessionId,
      previous: this.previousPlayback,
      current: playback,
    });

    for (const event of inferredEvents) {
      await this.options.repositories.events.appendPlayEvent(event);
    }

    const session = await this.deriveAndPersistSession(baseSession);
    this.previousPlayback = playback;

    return {
      session,
      inferredEvents,
      playback,
    };
  }

  async recordFeedback(
    feedbackEvent: FeedbackEvent
  ): Promise<PersonalModeFeedbackResult> {
    const baseSession = await this.ensureSession(feedbackEvent.occurredAt);

    await this.options.repositories.events.appendFeedbackEvent(feedbackEvent);

    const session = await this.deriveAndPersistSession(baseSession);

    return {
      session,
      feedbackEvent,
    };
  }

  getPreviousPlayback(): PlaybackState | null {
    return this.previousPlayback;
  }

  private async ensureSession(observedAt: string): Promise<Session> {
    const existing = await this.options.repositories.sessions.findById(
      this.options.sessionId
    );

    if (existing) return existing;

    return this.options.repositories.sessions.create({
      session: createSession(this.options.sessionId, new Date(observedAt)),
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

export function createPersonalModeLoop(
  options: PersonalModeLoopOptions
): PersonalModeLoop {
  return new PersonalModeLoop(options);
}
