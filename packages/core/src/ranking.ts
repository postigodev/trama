/**
 * Ranking engine - score candidates based on session context
 */

import type { Session, CandidateTrack, RankedCandidate } from './types';

export function rankCandidates(
  candidates: CandidateTrack[],
  session: Session
): RankedCandidate[] {
  return candidates
    .map(candidate => ({
      ...candidate,
      score: scoreCandidate(candidate, session),
      reasons: getReasons(candidate, session),
    }))
    .sort((a, b) => b.score - a.score);
}

function scoreCandidate(candidate: CandidateTrack, session: Session): number {
  let score = 0;

  // Completion reward
  if (session.completions.includes(candidate.id)) {
    score += 10;
  }

  // Skip penalty
  if (session.skips.includes(candidate.id)) {
    score -= 20;
  }

  // Feedback
  const feedback = session.feedback[candidate.id];
  if (feedback === 'like') score += 15;
  if (feedback === 'dislike') score -= 15;

  return score;
}

function getReasons(candidate: CandidateTrack, session: Session): string[] {
  const reasons: string[] = [];

  if (session.completions.includes(candidate.id)) {
    reasons.push('Matches recently completed tracks');
  }

  if (session.skips.includes(candidate.id)) {
    reasons.push('Was skipped earlier in session');
  }

  const feedback = session.feedback[candidate.id];
  if (feedback === 'like') reasons.push('Matches your feedback');
  if (feedback === 'dislike') reasons.push('Avoided based on feedback');

  return reasons;
}
