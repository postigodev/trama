/**
 * Session management and state tracking.
 */

import type { FeedbackEvent, FeedbackType, PlayEvent, Session, Track } from './types';
import { defaultSessionControls } from './types';

export type TrackLookup = (trackId: string) => Track | undefined;

export interface DeriveSessionInput {
  baseSession: Session;
  playEvents?: PlayEvent[];
  feedbackEvents?: FeedbackEvent[];
  getTrack?: TrackLookup;
}

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

export function applyPlayEvent(
  session: Session,
  event: PlayEvent,
  getTrack?: TrackLookup
): void {
  if (event.sessionId !== session.id) return;

  if (event.type === 'session_started') {
    session.status = 'active';
  }

  if (event.type === 'session_paused') {
    session.status = 'paused';
  }

  if (event.type === 'session_resumed') {
    session.status = 'active';
  }

  if (event.type === 'session_ended') {
    session.status = 'ended';
  }

  if (event.type === 'session_reset') {
    session.status = 'reset';
    session.currentTrackId = undefined;
    session.recentTrackIds = [];
    session.completedTrackIds = [];
    session.skippedTrackIds = [];
    session.replayedTrackIds = [];
    session.acceptedArtistIds = [];
    session.rejectedArtistIds = [];
    session.acceptedTags = [];
    session.rejectedTags = [];
    session.feedbackByTrack = {};
  }

  if (event.type === 'autopilot_enabled') {
    session.controls.autopilotEnabled = true;
  }

  if (event.type === 'autopilot_disabled') {
    session.controls.autopilotEnabled = false;
  }

  if (!event.trackId) {
    touchSession(session, event.occurredAt);
    return;
  }

  const track = getTrack?.(event.trackId);

  if (event.type === 'track_started') {
    addTrackStarted(session, event.trackId);
  }

  if (event.type === 'track_completed') {
    addTrackCompletion(session, event.trackId);
    markTrackAccepted(session, track);
  }

  if (event.type === 'track_skipped' || event.type === 'candidate_rejected') {
    addTrackSkip(session, event.trackId);
    markTrackRejected(session, track);
  }

  if (event.type === 'track_replayed') {
    addTrackReplay(session, event.trackId);
    markTrackAccepted(session, track);
  }

  if (event.type === 'candidate_queued') {
    addUniqueRecentTrack(session, event.trackId);
  }

  touchSession(session, event.occurredAt);
}

export function applyFeedbackEvent(
  session: Session,
  event: FeedbackEvent,
  getTrack?: TrackLookup
): void {
  if (event.sessionId !== session.id) return;

  const trackId = event.trackId ?? event.candidateTrackId;
  if (!trackId) {
    applyFeedbackControlEffect(session, event.type);
    touchSession(session, event.occurredAt);
    return;
  }

  addFeedback(session, trackId, event.type);
  applyFeedbackControlEffect(session, event.type);

  const track = getTrack?.(trackId);
  if (isPositiveFeedback(event.type)) {
    markTrackAccepted(session, track);
  }

  if (isNegativeFeedback(event.type)) {
    markTrackRejected(session, track);
  }

  touchSession(session, event.occurredAt);
}

export function deriveSessionFromEvents(input: DeriveSessionInput): Session {
  const session = cloneSession(input.baseSession);
  const events = [
    ...(input.playEvents ?? []).map(event => ({ kind: 'play' as const, event })),
    ...(input.feedbackEvents ?? []).map(event => ({
      kind: 'feedback' as const,
      event,
    })),
  ].sort((a, b) => a.event.occurredAt.localeCompare(b.event.occurredAt));

  for (const item of events) {
    if (item.kind === 'play') {
      applyPlayEvent(session, item.event, input.getTrack);
    } else {
      applyFeedbackEvent(session, item.event, input.getTrack);
    }
  }

  return session;
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

function touchSession(session: Session, occurredAt?: string): void {
  session.updatedAt = occurredAt ?? new Date().toISOString();
}

function markTrackAccepted(session: Session, track?: Track): void {
  if (!track) return;

  for (const artist of track.artists) {
    addUnique(session.acceptedArtistIds, artist.id);
  }

  for (const tag of track.tags ?? []) {
    addUnique(session.acceptedTags, tag);
  }
}

function markTrackRejected(session: Session, track?: Track): void {
  if (!track) return;

  for (const artist of track.artists) {
    addUnique(session.rejectedArtistIds, artist.id);
  }

  for (const tag of track.tags ?? []) {
    addUnique(session.rejectedTags, tag);
  }
}

function applyFeedbackControlEffect(session: Session, feedback: FeedbackType): void {
  if (feedback === 'keep_mood' || feedback === 'broke_the_mood') {
    session.controls.moodStrictness = clamp(session.controls.moodStrictness + 0.1);
  }

  if (feedback === 'surprise_me' || feedback === 'too_safe') {
    session.controls.exploration = clamp(session.controls.exploration + 0.1);
  }

  if (feedback === 'too_different') {
    session.controls.exploration = clamp(session.controls.exploration - 0.1);
    session.controls.moodStrictness = clamp(session.controls.moodStrictness + 0.1);
  }

  if (feedback === 'too_mainstream') {
    session.controls.mainstreamTolerance = clamp(
      session.controls.mainstreamTolerance - 0.1
    );
  }
}

function isPositiveFeedback(feedback: FeedbackType): boolean {
  return (
    feedback === 'fire' ||
    feedback === 'more_like_this' ||
    feedback === 'keep_mood' ||
    feedback === 'surprise_me'
  );
}

function isNegativeFeedback(feedback: FeedbackType): boolean {
  return (
    feedback === 'less_like_this' ||
    feedback === 'too_mainstream' ||
    feedback === 'too_different' ||
    feedback === 'broke_the_mood'
  );
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

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
