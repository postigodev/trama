import { describe, it, expect } from 'vitest';
import { createSession, addTrackCompletion, addTrackSkip, addFeedback } from '../session';

describe('@trama/core - Session Management', () => {
  it('should create a new session', () => {
    const session = createSession('session-1');
    expect(session.id).toBe('session-1');
    expect(session.completions).toEqual([]);
    expect(session.skips).toEqual([]);
    expect(session.feedback).toEqual({});
  });

  it('should add a track completion', () => {
    const session = createSession('session-1');
    addTrackCompletion(session, 'track-1');
    expect(session.completions).toContain('track-1');
  });

  it('should add a track skip', () => {
    const session = createSession('session-1');
    addTrackSkip(session, 'track-2');
    expect(session.skips).toContain('track-2');
  });

  it('should add feedback', () => {
    const session = createSession('session-1');
    addFeedback(session, 'track-3', 'like');
    expect(session.feedback['track-3']).toBe('like');
  });

  it('should not add duplicate completions', () => {
    const session = createSession('session-1');
    addTrackCompletion(session, 'track-1');
    addTrackCompletion(session, 'track-1');
    expect(session.completions.length).toBe(1);
  });
});
