import { describe, expect, it } from 'vitest';
import {
  addFeedback,
  addTrackCompletion,
  addTrackReplay,
  addTrackSkip,
  addTrackStarted,
  createSession,
} from './session';

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
});
