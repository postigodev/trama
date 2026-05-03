/**
 * Ranking engine - score candidates based on session context
 */

import type {
  Session,
  CandidateTrack,
  RankedCandidate,
  RankingConfig,
  ScoreBreakdown,
  RecommendationWarning,
} from './types';
import { defaultRankingConfig } from './types';

export function rankCandidates(
  candidates: CandidateTrack[],
  session: Session,
  config: RankingConfig = defaultRankingConfig
): RankedCandidate[] {
  return candidates
    .map((candidate): RankedCandidate => {
      const scoreBreakdown = scoreCandidate(candidate, session, config);

      return {
        track: candidate,
        score: scoreBreakdown.total,
        scoreBreakdown,
        reasons: getReasons(scoreBreakdown),
        warnings: getWarnings(candidate, session),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function scoreCandidate(
  candidate: CandidateTrack,
  session: Session,
  config: RankingConfig
): ScoreBreakdown {
  let completionAffinity = 0;
  let skipRisk = 0;
  let recentRepeatRisk = 0;
  let explicitFeedback = 0;

  if (session.completions.includes(candidate.id)) {
    completionAffinity += config.completionReward;
  }

  if (session.skips.includes(candidate.id)) {
    skipRisk -= config.skipPenalty;
  }

  if (session.tracks.some(track => track.id === candidate.id)) {
    recentRepeatRisk -= config.repeatPenalty;
  }

  const feedback = session.feedback[candidate.id];
  if (feedback === 'like') explicitFeedback += config.feedbackWeight;
  if (feedback === 'dislike') explicitFeedback -= config.feedbackWeight;

  const total = completionAffinity + skipRisk + recentRepeatRisk + explicitFeedback;

  return {
    completionAffinity,
    skipRisk,
    recentRepeatRisk,
    explicitFeedback,
    total,
  };
}

function getReasons(scoreBreakdown: ScoreBreakdown): string[] {
  const reasons: string[] = [];

  if (scoreBreakdown.completionAffinity > 0) {
    reasons.push('Matches recently completed tracks');
  }

  if (scoreBreakdown.recentRepeatRisk < 0) {
    reasons.push('Played recently in this session');
  }

  if (scoreBreakdown.explicitFeedback > 0) {
    reasons.push('Matches your positive feedback');
  }

  if (scoreBreakdown.explicitFeedback < 0) {
    reasons.push('Negative feedback lowers this recommendation');
  }

  if (scoreBreakdown.skipRisk < 0) {
    reasons.push('Artist or track was skipped earlier in session');
  }

  return reasons;
}

function getWarnings(
  candidate: CandidateTrack,
  session: Session
): RecommendationWarning[] {
  const warnings: RecommendationWarning[] = [];

  if (session.skips.includes(candidate.id)) {
    warnings.push('recently_skipped');
  }

  if (session.tracks.some(track => track.id === candidate.id)) {
    warnings.push('recent_repeat');
  }

  if (session.feedback[candidate.id] === 'dislike') {
    warnings.push('negative_feedback');
  }

  return warnings;
}
