/**
 * Core types for Trama
 */

export type FeedbackType = 'like' | 'dislike';

export type PlayEventType =
  | 'track_started'
  | 'track_completed'
  | 'track_skipped'
  | 'track_replayed';

export type FeedbackEventType = 'more_like_this' | 'less_like_this';

export interface CandidateTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  providerIds: Record<string, string>;
}

export interface Session {
  id: string;
  startedAt: Date;
  tracks: CandidateTrack[];
  completions: string[];
  skips: string[];
  feedback: Record<string, FeedbackType>;
}

export interface PlayEvent {
  id: string;
  sessionId: string;
  trackId: string;
  type: PlayEventType;
  occurredAt: string;
}

export interface FeedbackEvent {
  id: string;
  sessionId: string;
  trackId: string;
  type: FeedbackEventType;
  occurredAt: string;
}

export interface RankingConfig {
  completionReward: number;
  skipPenalty: number;
  repeatPenalty: number;
  feedbackWeight: number;
}

export interface ScoreBreakdown {
  completionAffinity: number;
  skipRisk: number;
  recentRepeatRisk: number;
  explicitFeedback: number;
  total: number;
}

export type RecommendationWarning =
  | 'recently_skipped'
  | 'recent_repeat'
  | 'negative_feedback';

export interface RankedCandidate {
  track: CandidateTrack;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: string[];
  warnings: RecommendationWarning[];
}

export const defaultRankingConfig: RankingConfig = {
  completionReward: 10,
  skipPenalty: 20,
  repeatPenalty: 8,
  feedbackWeight: 15,
};
