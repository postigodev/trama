/**
 * Demo scenarios for different listening contexts.
 */

import type {
  CandidateTrack,
  FeedbackEvent,
  PlayEvent,
  RankingConfig,
  Session,
  Track,
} from '../../core/src/types';
import { defaultRankingConfig, defaultSessionControls } from '../../core/src/types';
import { getTrackById, toCandidate } from './fixtures';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  currentTrack: Track;
  session: Session;
  candidates: CandidateTrack[];
  recentPlayEvents: PlayEvent[];
  feedbackEvents: FeedbackEvent[];
  config?: RankingConfig;
  expectedBehaviorNotes: string[];
}

const sessionBase = (input: Partial<Session> & Pick<Session, 'id'>): Session => ({
  status: 'active',
  mode: 'demo',
  startedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
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
  ...input,
});

const eventBase = (
  input: Omit<PlayEvent, 'inferred'>
): PlayEvent => ({
  inferred: false,
  ...input,
});

export const scenarios: DemoScenario[] = [
  {
    id: 'late-night-melodic-session',
    name: 'Late-night melodic session',
    description: 'Introspective and cohesive melodic flow',
    currentTrack: getTrackById('late-1'),
    session: sessionBase({
      id: 'session-late-night',
      currentTrackId: 'late-1',
      recentTrackIds: ['late-1'],
      completedTrackIds: ['late-1'],
      skippedTrackIds: ['break-1'],
      acceptedArtistIds: ['artist-luna-waves'],
      rejectedArtistIds: ['artist-noise-vessel'],
      acceptedTags: ['late-night', 'melodic', 'dark', 'synth'],
      rejectedTags: ['abrasive', 'bright', 'drop'],
      feedbackByTrack: {
        'late-2': ['more_like_this'],
        'break-2': ['less_like_this'],
      },
    }),
    candidates: [
      toCandidate(getTrackById('late-2'), 'playlist_adjacency'),
      toCandidate(getTrackById('break-1')),
      toCandidate(getTrackById('study-2')),
    ],
    recentPlayEvents: [
      eventBase({
        id: 'evt-ln-1',
        sessionId: 'session-late-night',
        trackId: 'late-1',
        type: 'track_completed',
        occurredAt: '2026-01-01T23:40:00.000Z',
      }),
    ],
    feedbackEvents: [
      {
        id: 'fb-ln-1',
        sessionId: 'session-late-night',
        trackId: 'late-2',
        type: 'more_like_this',
        occurredAt: '2026-01-01T23:41:00.000Z',
      },
    ],
    expectedBehaviorNotes: [
      'Melodic continuity should outrank disruptive candidates.',
      'Skipped or disliked tracks should rank lower.',
    ],
  },
  {
    id: 'gym-session',
    name: 'Gym session',
    description: 'High-energy set where familiarity can be acceptable',
    currentTrack: getTrackById('gym-1'),
    session: sessionBase({
      id: 'session-gym',
      currentTrackId: 'gym-1',
      recentTrackIds: ['gym-1'],
      completedTrackIds: ['gym-1'],
      replayedTrackIds: ['gym-1'],
      acceptedArtistIds: ['artist-city-beats'],
      acceptedTags: ['gym', 'high-energy', 'percussive'],
      controls: {
        ...defaultSessionControls,
        repeatTolerance: 0.8,
      },
    }),
    candidates: [
      toCandidate(getTrackById('gym-1')),
      toCandidate(getTrackById('gym-2'), 'playlist_cooccurrence'),
      toCandidate(getTrackById('study-1')),
    ],
    recentPlayEvents: [
      eventBase({
        id: 'evt-gym-1',
        sessionId: 'session-gym',
        trackId: 'gym-1',
        type: 'track_replayed',
        occurredAt: '2026-01-02T07:08:00.000Z',
      }),
    ],
    feedbackEvents: [],
    config: {
      ...defaultRankingConfig,
      repeatTolerance: 0.8,
    },
    expectedBehaviorNotes: [
      'Higher repeat tolerance should make familiar repeats less punished.',
    ],
  },
  {
    id: 'study-session',
    name: 'Study session',
    description: 'Low-distraction ambient flow',
    currentTrack: getTrackById('study-1'),
    session: sessionBase({
      id: 'session-study',
      currentTrackId: 'study-1',
      recentTrackIds: ['study-1'],
      completedTrackIds: ['study-1'],
      skippedTrackIds: ['break-2'],
      acceptedTags: ['study', 'ambient', 'low-pressure'],
      rejectedTags: ['abrasive', 'bright', 'drop'],
      feedbackByTrack: { 'study-2': ['more_like_this'] },
    }),
    candidates: [
      toCandidate(getTrackById('study-2'), 'playlist_adjacency'),
      toCandidate(getTrackById('late-2')),
      toCandidate(getTrackById('break-2')),
    ],
    recentPlayEvents: [
      eventBase({
        id: 'evt-study-1',
        sessionId: 'session-study',
        trackId: 'study-1',
        type: 'track_completed',
        occurredAt: '2026-01-02T14:20:00.000Z',
      }),
    ],
    feedbackEvents: [
      {
        id: 'fb-study-1',
        sessionId: 'session-study',
        trackId: 'study-2',
        type: 'more_like_this',
        occurredAt: '2026-01-02T14:21:00.000Z',
      },
    ],
    expectedBehaviorNotes: [
      'Focus-friendly tracks should be favored over disruptive choices.',
    ],
  },
  {
    id: 'broken-session-many-skips',
    name: 'Broken session with many skips',
    description: 'Session with rejection-heavy behavior',
    currentTrack: getTrackById('break-1'),
    session: sessionBase({
      id: 'session-broken',
      currentTrackId: 'break-1',
      recentTrackIds: ['break-2', 'break-1'],
      skippedTrackIds: ['break-1', 'break-2', 'gym-2'],
      rejectedArtistIds: ['artist-noise-vessel', 'artist-glitch-unit'],
      rejectedTags: ['abrasive', 'bright', 'drop', 'gym', 'high-energy'],
      acceptedTags: ['late-night', 'melodic'],
      feedbackByTrack: {
        'break-2': ['less_like_this'],
        'late-1': ['more_like_this'],
      },
    }),
    candidates: [
      toCandidate(getTrackById('break-2')),
      toCandidate(getTrackById('gym-2')),
      toCandidate(getTrackById('late-1')),
    ],
    recentPlayEvents: [
      eventBase({
        id: 'evt-broken-1',
        sessionId: 'session-broken',
        trackId: 'break-1',
        type: 'track_skipped',
        occurredAt: '2026-01-03T19:31:00.000Z',
      }),
      eventBase({
        id: 'evt-broken-2',
        sessionId: 'session-broken',
        trackId: 'break-2',
        type: 'track_skipped',
        occurredAt: '2026-01-03T19:34:00.000Z',
      }),
    ],
    feedbackEvents: [
      {
        id: 'fb-broken-1',
        sessionId: 'session-broken',
        trackId: 'break-2',
        type: 'less_like_this',
        occurredAt: '2026-01-03T19:35:00.000Z',
      },
    ],
    expectedBehaviorNotes: [
      'Skip-heavy and disliked candidates should sink.',
      'A positively signaled candidate should recover ranking.',
    ],
  },
];

export function getScenarioById(id: string): DemoScenario | undefined {
  return scenarios.find(scenario => scenario.id === id);
}
