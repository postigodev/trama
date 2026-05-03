import { describe, it, expect } from 'vitest';
import { rankCandidates } from '../ranking';
import type { Session, CandidateTrack } from '../types';

describe('@trama/core - Ranking Engine', () => {
  const mockCandidates: CandidateTrack[] = [
    {
      id: 'track-1',
      title: 'Song A',
      artist: 'Artist 1',
      duration: 180,
      providerIds: { spotify: 'spotify:track:1' },
    },
    {
      id: 'track-2',
      title: 'Song B',
      artist: 'Artist 2',
      duration: 200,
      providerIds: { spotify: 'spotify:track:2' },
    },
    {
      id: 'track-3',
      title: 'Song C',
      artist: 'Artist 3',
      duration: 220,
      providerIds: { spotify: 'spotify:track:3' },
    },
  ];

  const mockSession: Session = {
    id: 'session-1',
    startedAt: new Date(),
    tracks: [],
    completions: ['track-1'],
    skips: ['track-2'],
    feedback: { 'track-3': 'like' },
  };

  it('should rank candidates by score', () => {
    const ranked = rankCandidates(mockCandidates, mockSession);
    expect(ranked.length).toBe(3);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it('should assign reasons to recommendations', () => {
    const ranked = rankCandidates(mockCandidates, mockSession);
    expect(ranked[0].reasons.length).toBeGreaterThan(0);
  });

  it('should reward completed tracks', () => {
    const ranked = rankCandidates(mockCandidates, mockSession);
    const track1 = ranked.find(c => c.id === 'track-1');
    expect(track1?.reasons).toContain('Matches recently completed tracks');
  });

  it('should penalize skipped tracks', () => {
    const ranked = rankCandidates(mockCandidates, mockSession);
    const track2 = ranked.find(c => c.id === 'track-2');
    expect(track2?.reasons).toContain('Was skipped earlier in session');
  });

  it('should reward liked tracks', () => {
    const ranked = rankCandidates(mockCandidates, mockSession);
    const track3 = ranked.find(c => c.id === 'track-3');
    expect(track3?.reasons).toContain('Matches your feedback');
  });
});
