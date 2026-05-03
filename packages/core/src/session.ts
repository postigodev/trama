/**
 * Session management and state tracking
 */

import type { Session, CandidateTrack } from './types';

export function createSession(id: string): Session {
  return {
    id,
    startedAt: new Date(),
    tracks: [],
    completions: [],
    skips: [],
    feedback: {},
  };
}

export function addTrackCompletion(session: Session, trackId: string): void {
  if (!session.completions.includes(trackId)) {
    session.completions.push(trackId);
  }
}

export function addTrackSkip(session: Session, trackId: string): void {
  if (!session.skips.includes(trackId)) {
    session.skips.push(trackId);
  }
}

export function addFeedback(
  session: Session,
  trackId: string,
  type: 'like' | 'dislike'
): void {
  session.feedback[trackId] = type;
}
