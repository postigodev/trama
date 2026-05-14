/**
 * Provider-independent core types for Trama.
 */

export type ProviderName =
  | 'spotify'
  | 'demo'
  | 'local'
  | 'listenbrainz'
  | 'lastfm'
  | 'apple_music'
  | 'youtube_music';

export type ProviderIds = Partial<Record<ProviderName, string>>;

export interface ArtistSummary {
  id: string;
  name: string;
  providerIds?: ProviderIds;
}

export interface AlbumSummary {
  id: string;
  title: string;
  artworkUrl?: string;
  providerIds?: ProviderIds;
}

export type TrackSource =
  | 'provider_current_playback'
  | 'provider_recently_played'
  | 'provider_playlist'
  | 'provider_search'
  | 'provider_artist_top_tracks'
  | 'demo_fixture'
  | 'manual_import'
  | 'local_cache';

export interface Track {
  id: string;
  providerIds: ProviderIds;
  title: string;
  artists: ArtistSummary[];
  album?: AlbumSummary;
  durationMs: number;
  popularity?: number;
  explicit?: boolean;
  artworkUrl?: string;
  tags?: string[];
  source?: TrackSource;
  createdAt?: string;
  updatedAt?: string;
}

export type CandidateSource =
  | 'playlist_cooccurrence'
  | 'playlist_adjacency'
  | 'current_artist'
  | 'accepted_artist'
  | 'recently_played_relation'
  | 'library_relation'
  | 'provider_search'
  | 'demo_pool'
  | 'manual_seed';

export interface CandidateSourceRef {
  type: 'track' | 'artist' | 'album' | 'playlist' | 'event' | 'feedback';
  id: string;
}

export interface CandidateTrack {
  track: Track;
  source: CandidateSource;
  sourceRefs?: CandidateSourceRef[];
  generatedAt: string;
  unavailable?: boolean;
  unavailableReason?: string;
}

export type SessionStatus = 'active' | 'paused' | 'ended' | 'reset';
export type SessionMode = 'default' | 'keep_mood' | 'explore' | 'demo' | 'lab';

export interface SessionControls {
  moodStrictness: number;
  exploration: number;
  repeatTolerance: number;
  mainstreamTolerance: number;
  autopilotEnabled: boolean;
}

export type FeedbackType =
  | 'fire'
  | 'more_like_this'
  | 'less_like_this'
  | 'too_mainstream'
  | 'too_safe'
  | 'too_different'
  | 'broke_the_mood'
  | 'keep_mood'
  | 'surprise_me';

export interface Session {
  id: string;
  status: SessionStatus;
  mode: SessionMode;
  startedAt: string;
  updatedAt: string;
  seedTrackId?: string;
  currentTrackId?: string;
  recentTrackIds: string[];
  completedTrackIds: string[];
  skippedTrackIds: string[];
  replayedTrackIds: string[];
  acceptedArtistIds: string[];
  rejectedArtistIds: string[];
  acceptedTags: string[];
  rejectedTags: string[];
  feedbackByTrack: Record<string, FeedbackType[]>;
  controls: SessionControls;
}

export type PlayEventType =
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'session_ended'
  | 'session_reset'
  | 'track_started'
  | 'track_completed'
  | 'track_skipped'
  | 'track_replayed'
  | 'track_paused'
  | 'track_resumed'
  | 'candidate_queued'
  | 'candidate_rejected'
  | 'autopilot_enabled'
  | 'autopilot_disabled';

export interface PlayEvent {
  id: string;
  sessionId: string;
  trackId?: string;
  providerName?: ProviderName;
  providerPlaybackId?: string;
  type: PlayEventType;
  occurredAt: string;
  progressMs?: number;
  durationMs?: number;
  inferred: boolean;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface FeedbackEvent {
  id: string;
  sessionId: string;
  trackId?: string;
  candidateTrackId?: string;
  type: FeedbackType;
  occurredAt: string;
  weight?: number;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface RankingConfig {
  moodStrictness: number;
  exploration: number;
  repeatTolerance: number;
  mainstreamTolerance: number;
  feedbackWeight: number;
}

export interface ScoreComponent {
  raw: number;
  weight: number;
  contribution: number;
}

export interface ScoreBreakdown {
  total: number;
  components: {
    sessionSimilarity: ScoreComponent;
    artistAffinity: ScoreComponent;
    playlistAffinity: ScoreComponent;
    completionAffinity: ScoreComponent;
    explicitFeedback: ScoreComponent;
    novelty: ScoreComponent;
    mainstream: ScoreComponent;
    skipRisk: ScoreComponent;
    recentRepeatRisk: ScoreComponent;
    moodBreakRisk: ScoreComponent;
  };
}

export type RecommendationReasonType =
  | 'session_match'
  | 'artist_affinity'
  | 'playlist_relation'
  | 'completion_signal'
  | 'explicit_feedback'
  | 'novelty'
  | 'not_recently_played'
  | 'safe_transition'
  | 'controlled_surprise';

export interface RecommendationReason {
  id: string;
  type: RecommendationReasonType;
  message: string;
  component?: keyof ScoreBreakdown['components'];
  strength: 'low' | 'medium' | 'high';
}

export type RecommendationWarningType =
  | 'recent_repeat'
  | 'skip_risk'
  | 'mood_break_risk'
  | 'high_novelty'
  | 'low_session_similarity'
  | 'mainstream_risk'
  | 'provider_unavailable'
  | 'negative_feedback';

export interface RecommendationWarning {
  id: string;
  type: RecommendationWarningType;
  message: string;
  component?: keyof ScoreBreakdown['components'];
  severity: 'low' | 'medium' | 'high';
}

export interface RankedCandidate {
  track: Track;
  rank: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: RecommendationReason[];
  warnings: RecommendationWarning[];
  generatedAt: string;
}

export const defaultSessionControls: SessionControls = {
  moodStrictness: 0.7,
  exploration: 0.25,
  repeatTolerance: 0.25,
  mainstreamTolerance: 0.5,
  autopilotEnabled: false,
};

export const defaultRankingConfig: RankingConfig = {
  moodStrictness: 0.7,
  exploration: 0.25,
  repeatTolerance: 0.25,
  mainstreamTolerance: 0.5,
  feedbackWeight: 0.8,
};
