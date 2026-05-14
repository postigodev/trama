/**
 * Ranking engine - score candidates based on session context.
 */

import type {
  CandidateTrack,
  RankingConfig,
  RankedCandidate,
  RecommendationReason,
  RecommendationWarning,
  ScoreBreakdown,
  ScoreComponent,
  Session,
  Track,
} from './types';
import { defaultRankingConfig } from './types';

export function rankCandidates(
  candidates: CandidateTrack[],
  session: Session,
  config: RankingConfig = {
    ...defaultRankingConfig,
    ...session.controls,
  }
): RankedCandidate[] {
  return candidates
    .filter(candidate => !candidate.unavailable)
    .map((candidate): Omit<RankedCandidate, 'rank'> => {
      const scoreBreakdown = scoreCandidate(candidate, session, config);

      return {
        track: candidate.track,
        score: scoreBreakdown.total,
        scoreBreakdown,
        reasons: getReasons(scoreBreakdown),
        warnings: getWarnings(candidate, session, scoreBreakdown),
        generatedAt: candidate.generatedAt,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
}

function scoreCandidate(
  candidate: CandidateTrack,
  session: Session,
  config: RankingConfig
): ScoreBreakdown {
  const track = candidate.track;
  const sessionSimilarity = component(
    computeSessionSimilarity(track, session),
    0.25 + config.moodStrictness * 0.1
  );
  const artistAffinity = component(computeArtistAffinity(track, session), 0.15);
  const playlistAffinity = component(computePlaylistAffinity(candidate), 0.15);
  const completionAffinity = component(
    computeCompletionAffinity(track, session),
    0.15
  );
  const explicitFeedback = component(
    computeExplicitFeedback(track, session),
    0.2 * config.feedbackWeight
  );
  const novelty = component(computeNovelty(track, session), 0.1 * config.exploration);
  const mainstream = component(
    computeMainstream(track, config),
    0.05 * (1 - config.mainstreamTolerance)
  );
  const skipRisk = component(computeSkipRisk(track, session), -0.25);
  const recentRepeatRisk = component(
    computeRecentRepeatRisk(track, session),
    -0.2 * (1 - config.repeatTolerance)
  );
  const moodBreakRisk = component(
    computeMoodBreakRisk(sessionSimilarity.raw, skipRisk.raw),
    -0.25 * config.moodStrictness
  );

  const components = {
    sessionSimilarity,
    artistAffinity,
    playlistAffinity,
    completionAffinity,
    explicitFeedback,
    novelty,
    mainstream,
    skipRisk,
    recentRepeatRisk,
    moodBreakRisk,
  };

  return {
    total: roundScore(
      Object.values(components).reduce(
        (sum, scoreComponent) => sum + scoreComponent.contribution,
        0
      )
    ),
    components,
  };
}

function computeSessionSimilarity(track: Track, session: Session): number {
  const signalIds = [
    session.currentTrackId,
    ...session.completedTrackIds,
    ...session.replayedTrackIds,
  ].filter(Boolean);

  if (signalIds.includes(track.id)) return 1;

  const acceptedTagOverlap = overlapRatio(track.tags ?? [], acceptedTags(session));
  if (acceptedTagOverlap > 0) return acceptedTagOverlap;

  return 0;
}

function computeArtistAffinity(track: Track, session: Session): number {
  const artistIds = track.artists.map(artist => artist.id);
  const acceptedArtistIds = acceptedArtists(session);
  const rejectedArtistIds = rejectedArtists(session);

  if (artistIds.some(id => rejectedArtistIds.includes(id))) return -1;
  if (artistIds.some(id => acceptedArtistIds.includes(id))) return 1;

  return 0;
}

function computePlaylistAffinity(candidate: CandidateTrack): number {
  if (
    candidate.source === 'playlist_cooccurrence' ||
    candidate.source === 'playlist_adjacency'
  ) {
    return 1;
  }

  if (candidate.sourceRefs?.some(ref => ref.type === 'playlist')) {
    return 0.7;
  }

  return 0;
}

function computeCompletionAffinity(track: Track, session: Session): number {
  if (session.completedTrackIds.includes(track.id)) return 1;

  const tags = track.tags ?? [];
  return overlapRatio(tags, acceptedTags(session));
}

function computeExplicitFeedback(track: Track, session: Session): number {
  const feedback = session.feedbackByTrack[track.id] ?? [];
  let score = 0;

  for (const item of feedback) {
    if (item === 'fire') score += 1;
    if (item === 'more_like_this') score += 0.8;
    if (item === 'keep_mood') score += 0.5;
    if (item === 'surprise_me') score += 0.35;
    if (item === 'less_like_this') score -= 0.8;
    if (item === 'broke_the_mood') score -= 1;
    if (item === 'too_different') score -= 0.5;
    if (item === 'too_mainstream') score -= mainstreamRaw(track);
    if (item === 'too_safe') score -= 0.25;
  }

  return clamp(score, -1, 1);
}

function computeNovelty(track: Track, session: Session): number {
  if (session.recentTrackIds.includes(track.id)) return -1;
  if (session.completedTrackIds.includes(track.id)) return -0.4;
  return 0.6;
}

function computeMainstream(track: Track, config: RankingConfig): number {
  const popularity = mainstreamRaw(track);
  if (popularity === 0) return 0;

  return popularity > config.mainstreamTolerance ? -popularity : popularity * 0.25;
}

function computeSkipRisk(track: Track, session: Session): number {
  if (session.skippedTrackIds.includes(track.id)) return 1;

  const skippedTagOverlap = overlapRatio(track.tags ?? [], rejectedTags(session));
  const artistIds = track.artists.map(artist => artist.id);
  const skippedArtistOverlap = artistIds.some(id => rejectedArtists(session).includes(id));

  if (skippedArtistOverlap) return 0.8;
  return skippedTagOverlap;
}

function computeRecentRepeatRisk(track: Track, session: Session): number {
  if (session.recentTrackIds[0] === track.id) return 1;
  if (session.recentTrackIds.includes(track.id)) return 0.8;

  return 0;
}

function computeMoodBreakRisk(sessionSimilarity: number, skipRisk: number): number {
  if (sessionSimilarity >= 0.5) return 0;
  return clamp(0.5 + skipRisk * 0.5, 0, 1);
}

function getReasons(scoreBreakdown: ScoreBreakdown): RecommendationReason[] {
  const reasons: RecommendationReason[] = [];
  const { components } = scoreBreakdown;

  if (components.sessionSimilarity.contribution > 0) {
    reasons.push(reason('session-match', 'session_match', 'Matches the current session direction.', 'sessionSimilarity', components.sessionSimilarity.raw));
  }

  if (components.artistAffinity.contribution > 0) {
    reasons.push(reason('artist-affinity', 'artist_affinity', 'Connects to artists accepted in this session.', 'artistAffinity', components.artistAffinity.raw));
  }

  if (components.playlistAffinity.contribution > 0) {
    reasons.push(reason('playlist-relation', 'playlist_relation', 'Appears in a playlist relation tied to the candidate source.', 'playlistAffinity', components.playlistAffinity.raw));
  }

  if (components.completionAffinity.contribution > 0) {
    reasons.push(reason('completion-signal', 'completion_signal', 'Matches recently completed tracks.', 'completionAffinity', components.completionAffinity.raw));
  }

  if (components.explicitFeedback.contribution > 0) {
    reasons.push(reason('explicit-feedback', 'explicit_feedback', 'Matches explicit positive feedback in this session.', 'explicitFeedback', components.explicitFeedback.raw));
  }

  if (components.novelty.contribution > 0) {
    reasons.push(reason('controlled-novelty', 'controlled_surprise', 'Adds controlled novelty without repeating the immediate session.', 'novelty', components.novelty.raw));
  }

  if (components.recentRepeatRisk.raw === 0) {
    reasons.push(reason('not-recently-played', 'not_recently_played', 'Not played recently in this session.', 'recentRepeatRisk', 0.6));
  }

  return reasons;
}

function getWarnings(
  candidate: CandidateTrack,
  session: Session,
  scoreBreakdown: ScoreBreakdown
): RecommendationWarning[] {
  const warnings: RecommendationWarning[] = [];
  const { components } = scoreBreakdown;

  if (candidate.unavailable) {
    warnings.push(
      warning(
        'provider-unavailable',
        'provider_unavailable',
        candidate.unavailableReason ??
          'Candidate is unavailable on the active provider.',
        undefined,
        'high'
      )
    );
  }

  if (components.skipRisk.raw > 0) {
    warnings.push(warning('skip-risk', 'skip_risk', 'Related to a track or direction skipped earlier in this session.', 'skipRisk', 'high'));
  }

  if (components.recentRepeatRisk.raw > 0) {
    warnings.push(warning('recent-repeat', 'recent_repeat', 'Played recently in this session.', 'recentRepeatRisk', 'medium'));
  }

  if (components.moodBreakRisk.raw > 0.5) {
    warnings.push(warning('mood-break-risk', 'mood_break_risk', 'Less connected to the current session direction.', 'moodBreakRisk', 'medium'));
  }

  if (components.explicitFeedback.raw < 0) {
    warnings.push(warning('negative-feedback', 'negative_feedback', 'Explicit feedback lowered this candidate.', 'explicitFeedback', 'high'));
  }

  if ((session.feedbackByTrack[candidate.track.id] ?? []).includes('too_mainstream')) {
    warnings.push(warning('mainstream-risk', 'mainstream_risk', 'Marked too mainstream in this session.', 'explicitFeedback', 'medium'));
  }

  return warnings;
}

function component(raw: number, weight: number): ScoreComponent {
  return {
    raw: roundScore(raw),
    weight: roundScore(weight),
    contribution: roundScore(raw * weight),
  };
}

function reason(
  id: RecommendationReason['id'],
  type: RecommendationReason['type'],
  message: string,
  componentName: NonNullable<RecommendationReason['component']>,
  raw: number
): RecommendationReason {
  return {
    id,
    type,
    message,
    component: componentName,
    strength: strengthFromRaw(raw),
  };
}

function warning(
  id: RecommendationWarning['id'],
  type: RecommendationWarning['type'],
  message: string,
  componentName: RecommendationWarning['component'],
  severity: RecommendationWarning['severity']
): RecommendationWarning {
  return {
    id,
    type,
    message,
    component: componentName,
    severity,
  };
}

function acceptedTags(session: Session): string[] {
  return session.acceptedTags;
}

function rejectedTags(session: Session): string[] {
  return session.rejectedTags;
}

function acceptedArtists(session: Session): string[] {
  return session.acceptedArtistIds;
}

function rejectedArtists(session: Session): string[] {
  return session.rejectedArtistIds;
}

function overlapRatio(values: string[], signals: string[]): number {
  if (values.length === 0 || signals.length === 0) return 0;
  const signalSet = new Set(signals);
  const overlap = values.filter(value => signalSet.has(value)).length;
  return clamp(overlap / values.length, 0, 1);
}

function mainstreamRaw(track: Track): number {
  if (typeof track.popularity !== 'number') return 0;
  return clamp(track.popularity / 100, 0, 1);
}

function strengthFromRaw(raw: number): RecommendationReason['strength'] {
  const value = Math.abs(raw);
  if (value >= 0.75) return 'high';
  if (value >= 0.4) return 'medium';
  return 'low';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}
