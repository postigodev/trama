import { describe, expect, it } from 'vitest';
import {
  addFeedback,
  addTrackCompletion,
  addTrackReplay,
  addTrackSkip,
  addTrackStarted,
  applyFeedbackEvent,
  applyPlayEvent,
  createSession,
  deriveSessionFromEvents,
} from './session';
import type { FeedbackEvent, PlayEvent, Track } from './types';

const trackA: Track = {
  id: 'track-a',
  title: 'Track A',
  artists: [{ id: 'artist-a', name: 'Artist A' }],
  durationMs: 180000,
  providerIds: { demo: 'demo:track-a' },
  tags: ['late-night', 'melodic'],
};

const trackB: Track = {
  id: 'track-b',
  title: 'Track B',
  artists: [{ id: 'artist-b', name: 'Artist B' }],
  durationMs: 200000,
  providerIds: { demo: 'demo:track-b' },
  tags: ['abrasive', 'bright'],
};

const getTrack = (trackId: string): Track | undefined =>
  [trackA, trackB].find(track => track.id === trackId);

describe('@trama/core - Session Management', () => {
  it('creates a new active session', () => {
    const session = createSession(
      'session-1',
      new Date('2026-01-01T00:00:00.000Z')
    );

    expect(session.id).toBe('session-1');
    expect(session.status).toBe('active');
    expect(session.completedTrackIds).toEqual([]);
    expect(session.skippedTrackIds).toEqual([]);
    expect(session.feedbackByTrack).toEqual({});
  });

  it('tracks the current and recent track when a track starts', () => {
    const session = createSession('session-1');

    addTrackStarted(session, 'track-1');

    expect(session.currentTrackId).toBe('track-1');
    expect(session.recentTrackIds[0]).toBe('track-1');
  });

  it('adds a track completion once', () => {
    const session = createSession('session-1');

    addTrackCompletion(session, 'track-1');
    addTrackCompletion(session, 'track-1');

    expect(session.completedTrackIds).toEqual(['track-1']);
  });

  it('adds skips and replays', () => {
    const session = createSession('session-1');

    addTrackSkip(session, 'track-2');
    addTrackReplay(session, 'track-3');

    expect(session.skippedTrackIds).toContain('track-2');
    expect(session.replayedTrackIds).toContain('track-3');
  });

  it('adds structured feedback without duplicates', () => {
    const session = createSession('session-1');

    addFeedback(session, 'track-3', 'more_like_this');
    addFeedback(session, 'track-3', 'more_like_this');
    addFeedback(session, 'track-3', 'broke_the_mood');

    expect(session.feedbackByTrack['track-3']).toEqual([
      'more_like_this',
      'broke_the_mood',
    ]);
  });

  it('applies play events to session state', () => {
    const session = createSession('session-1');
    const completedEvent: PlayEvent = {
      id: 'event-1',
      sessionId: 'session-1',
      trackId: 'track-a',
      type: 'track_completed',
      occurredAt: '2026-01-01T00:03:00.000Z',
      inferred: true,
      progressMs: 179000,
      durationMs: 180000,
    };
    const skippedEvent: PlayEvent = {
      id: 'event-2',
      sessionId: 'session-1',
      trackId: 'track-b',
      type: 'track_skipped',
      occurredAt: '2026-01-01T00:04:00.000Z',
      inferred: true,
      progressMs: 20000,
      durationMs: 200000,
    };

    applyPlayEvent(session, completedEvent, getTrack);
    applyPlayEvent(session, skippedEvent, getTrack);

    expect(session.completedTrackIds).toContain('track-a');
    expect(session.skippedTrackIds).toContain('track-b');
    expect(session.acceptedArtistIds).toContain('artist-a');
    expect(session.rejectedArtistIds).toContain('artist-b');
    expect(session.acceptedTags).toContain('melodic');
    expect(session.rejectedTags).toContain('abrasive');
    expect(session.updatedAt).toBe('2026-01-01T00:04:00.000Z');
  });

  it('applies feedback events to track signals and controls', () => {
    const session = createSession('session-1');
    const feedbackEvent: FeedbackEvent = {
      id: 'feedback-1',
      sessionId: 'session-1',
      trackId: 'track-b',
      type: 'broke_the_mood',
      occurredAt: '2026-01-01T00:05:00.000Z',
    };

    applyFeedbackEvent(session, feedbackEvent, getTrack);

    expect(session.feedbackByTrack['track-b']).toEqual(['broke_the_mood']);
    expect(session.rejectedArtistIds).toContain('artist-b');
    expect(session.rejectedTags).toContain('bright');
    expect(session.controls.moodStrictness).toBeCloseTo(0.8);
    expect(session.updatedAt).toBe('2026-01-01T00:05:00.000Z');
  });

  it('derives a session from ordered play and feedback events without mutating the base', () => {
    const baseSession = createSession(
      'session-1',
      new Date('2026-01-01T00:00:00.000Z')
    );
    const playEvents: PlayEvent[] = [
      {
        id: 'event-2',
        sessionId: 'session-1',
        trackId: 'track-b',
        type: 'track_started',
        occurredAt: '2026-01-01T00:02:00.000Z',
        inferred: false,
      },
      {
        id: 'event-1',
        sessionId: 'session-1',
        trackId: 'track-a',
        type: 'track_completed',
        occurredAt: '2026-01-01T00:01:00.000Z',
        inferred: true,
      },
    ];
    const feedbackEvents: FeedbackEvent[] = [
      {
        id: 'feedback-1',
        sessionId: 'session-1',
        candidateTrackId: 'track-b',
        type: 'too_different',
        occurredAt: '2026-01-01T00:03:00.000Z',
      },
    ];

    const derived = deriveSessionFromEvents({
      baseSession,
      playEvents,
      feedbackEvents,
      getTrack,
    });

    expect(baseSession.recentTrackIds).toEqual([]);
    expect(derived.completedTrackIds).toEqual(['track-a']);
    expect(derived.currentTrackId).toBe('track-b');
    expect(derived.feedbackByTrack['track-b']).toEqual(['too_different']);
    expect(derived.controls.exploration).toBeCloseTo(0.15);
    expect(derived.controls.moodStrictness).toBeCloseTo(0.8);
  });

  it('applies session and autopilot events', () => {
    const session = createSession('session-1');

    applyPlayEvent(session, {
      id: 'event-1',
      sessionId: 'session-1',
      type: 'autopilot_enabled',
      occurredAt: '2026-01-01T00:01:00.000Z',
      inferred: false,
    });
    applyPlayEvent(session, {
      id: 'event-2',
      sessionId: 'session-1',
      type: 'session_ended',
      occurredAt: '2026-01-01T00:02:00.000Z',
      inferred: false,
    });

    expect(session.controls.autopilotEnabled).toBe(true);
    expect(session.status).toBe('ended');
  });
});
