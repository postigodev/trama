/**
 * Demo scenarios for different listening contexts
 */

import type {
  CandidateTrack,
  FeedbackEvent,
  RankingConfig,
  Session,
  PlayEvent,
} from '../../core/src/types';
import { defaultRankingConfig } from '../../core/src/types';
import { mockTracks } from './fixtures';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  currentTrack: CandidateTrack;
  session: Session;
  candidates: CandidateTrack[];
  recentPlayEvents: PlayEvent[];
  feedbackEvents: FeedbackEvent[];
  config?: RankingConfig;
  expectedBehaviorNotes: string[];
}

const trackById = (id: string): CandidateTrack => {
  const track = mockTracks.find(item => item.id === id);
  if (!track) {
    throw new Error(`Track not found for scenario fixture: ${id}`);
  }
  return track;
};

export const scenarios: DemoScenario[] = [
  {
    id: 'late-night-melodic-session',
    name: 'Late-night melodic session',
    description: 'Introspective and cohesive melodic flow',
    currentTrack: trackById('late-1'),
    session: {
      id: 'session-late-night',
      startedAt: new Date('2026-01-01T23:30:00.000Z'),
      tracks: [trackById('late-1')],
      completions: ['late-1'],
      skips: ['break-1'],
      feedback: { 'late-2': 'like', 'break-2': 'dislike' },
    },
    candidates: [trackById('late-2'), trackById('break-1'), trackById('study-2')],
    recentPlayEvents: [
      {
        id: 'evt-ln-1',
        sessionId: 'session-late-night',
        trackId: 'late-1',
        type: 'track_completed',
        occurredAt: '2026-01-01T23:40:00.000Z',
      },
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
    currentTrack: trackById('gym-1'),
    session: {
      id: 'session-gym',
      startedAt: new Date('2026-01-02T07:00:00.000Z'),
      tracks: [trackById('gym-1')],
      completions: ['gym-1'],
      skips: [],
      feedback: {},
    },
    candidates: [trackById('gym-1'), trackById('gym-2'), trackById('study-1')],
    recentPlayEvents: [
      {
        id: 'evt-gym-1',
        sessionId: 'session-gym',
        trackId: 'gym-1',
        type: 'track_replayed',
        occurredAt: '2026-01-02T07:08:00.000Z',
      },
    ],
    feedbackEvents: [],
    config: {
      ...defaultRankingConfig,
      repeatPenalty: 2,
    },
    expectedBehaviorNotes: [
      'Lower repeat penalty should make familiar repeats less punished.',
    ],
  },
  {
    id: 'study-session',
    name: 'Study session',
    description: 'Low-distraction ambient flow',
    currentTrack: trackById('study-1'),
    session: {
      id: 'session-study',
      startedAt: new Date('2026-01-02T14:00:00.000Z'),
      tracks: [trackById('study-1')],
      completions: ['study-1'],
      skips: ['break-2'],
      feedback: { 'study-2': 'like' },
    },
    candidates: [trackById('study-2'), trackById('late-2'), trackById('break-2')],
    recentPlayEvents: [
      {
        id: 'evt-study-1',
        sessionId: 'session-study',
        trackId: 'study-1',
        type: 'track_completed',
        occurredAt: '2026-01-02T14:20:00.000Z',
      },
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
    currentTrack: trackById('break-1'),
    session: {
      id: 'session-broken',
      startedAt: new Date('2026-01-03T19:30:00.000Z'),
      tracks: [trackById('break-1'), trackById('break-2')],
      completions: [],
      skips: ['break-1', 'break-2', 'gym-2'],
      feedback: { 'break-2': 'dislike', 'late-1': 'like' },
    },
    candidates: [trackById('break-2'), trackById('gym-2'), trackById('late-1')],
    recentPlayEvents: [
      {
        id: 'evt-broken-1',
        sessionId: 'session-broken',
        trackId: 'break-1',
        type: 'track_skipped',
        occurredAt: '2026-01-03T19:31:00.000Z',
      },
      {
        id: 'evt-broken-2',
        sessionId: 'session-broken',
        trackId: 'break-2',
        type: 'track_skipped',
        occurredAt: '2026-01-03T19:34:00.000Z',
      },
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
