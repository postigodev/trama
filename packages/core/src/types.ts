/**
 * Core types for Trama
 */

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
  feedback: Record<string, 'like' | 'dislike'>;
}

export interface RankedCandidate extends CandidateTrack {
  score: number;
  reasons: string[];
}
