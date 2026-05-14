/**
 * Session management and state tracking.
 */

import type { FeedbackType, Session } from './types';
import { defaultSessionControls } from './types';

export function createSession(id: string, now = new Date()): Session {
  const timestamp = now.toISOString();

  return {
    id,
    status: 'active',
    mode: 'default',
    startedAt: timestamp,
    updatedAt: timestamp,
    recentTrackIds: [],
    completedTrackIds: [],
    skippedTrackIds: [],
    replayedTrackIds: [],
    acceptedArtistIds: [],
    rejectedArtistIds: [],
    acceptedTags: [],
    rejectedTags: [],
    feedbackByTrack: {},
    controls: { ...defaultSessionControls },
  };
}

export function addTrackStarted(session: Session, trackId: string): void {
  session.currentTrackId = trackId;
  addUniqueRecentTrack(session, trackId);
  touchSession(session);
}

export function addTrackCompletion(session: Session, trackId: string): void {
  addUnique(session.completedTrackIds, trackId);
  addUniqueRecentTrack(session, trackId);
  touchSession(session);
}

export function addTrackSkip(session: Session, trackId: string): void {
  addUnique(session.skippedTrackIds, trackId);
  addUniqueRecentTrack(session, trackId);
  touchSession(session);
}

export function addTrackReplay(session: Session, trackId: string): void {
  addUnique(session.replayedTrackIds, trackId);
  addUniqueRecentTrack(session, trackId);
  touchSession(session);
}

export function addFeedback(
  session: Session,
  trackId: string,
  type: FeedbackType
): void {
  const feedback = session.feedbackByTrack[trackId] ?? [];
  if (!feedback.includes(type)) {
    session.feedbackByTrack[trackId] = [...feedback, type];
  }
  touchSession(session);
}

function addUniqueRecentTrack(session: Session, trackId: string): void {
  const withoutTrack = session.recentTrackIds.filter(id => id !== trackId);
  session.recentTrackIds = [trackId, ...withoutTrack].slice(0, 20);
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function touchSession(session: Session): void {
  session.updatedAt = new Date().toISOString();
}
