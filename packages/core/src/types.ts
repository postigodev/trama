/**
 * Core types for Trama
 */

export type FeedbackType = 'like' | 'dislike';

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
