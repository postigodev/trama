import { describe, expect, it } from 'vitest';
import { rankCandidates } from './ranking';
import type { CandidateTrack, Session, Track } from './types';
import { defaultSessionControls } from './types';

const generatedAt = '2026-01-01T00:00:00.000Z';

const tracks: Track[] = [
  {
    id: 'track-1',
    title: 'Song A',
    artists: [{ id: 'artist-1', name: 'Artist 1' }],
    durationMs: 180000,
    providerIds: { demo: 'demo:track:1' },
    tags: ['late-night', 'melodic'],
    popularity: 40,
  },
  {
    id: 'track-2',
    title: 'Song B',
    artists: [{ id: 'artist-2', name: 'Artist 2' }],
    durationMs: 200000,
    providerIds: { demo: 'demo:track:2' },
    tags: ['abrasive', 'bright'],
    popularity: 80,
  },
  {
    id: 'track-3',
    title: 'Song C',
    artists: [{ id: 'artist-3', name: 'Artist 3' }],
    durationMs: 220000,
    providerIds: { demo: 'demo:track:3' },
    tags: ['late-night', 'melodic'],
    popularity: 30,
  },
];

const candidates: CandidateTrack[] = tracks.map(track => ({
  track,
  source: track.id === 'track-1' ? 'playlist_adjacency' : 'demo_pool',
  generatedAt,
}));

const session: Session = {
  id: 'session-1',
  status: 'active',
  mode: 'demo',
  startedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  currentTrackId: 'seed-track',
  recentTrackIds: ['track-2'],
  completedTrackIds: ['track-1'],
  skippedTrackIds: ['track-2'],
  replayedTrackIds: [],
  acceptedArtistIds: ['artist-1'],
  rejectedArtistIds: ['artist-2'],
  acceptedTags: ['late-night', 'melodic'],
  rejectedTags: ['abrasive', 'bright'],
  feedbackByTrack: { 'track-3': ['more_like_this'] },
  controls: { ...defaultSessionControls },
};

describe('@trama/core - Ranking Engine', () => {
  it('ranks candidates deterministically by score and rank', () => {
    const ranked = rankCandidates(candidates, session);

    expect(ranked).toHaveLength(3);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
  });

  it('returns structured reasons grounded in score components', () => {
    const ranked = rankCandidates(candidates, session);
    const top = ranked[0];

    expect(top.reasons.length).toBeGreaterThan(0);
    expect(top.reasons.every(reason => reason.component)).toBe(true);
  });

  it('rewards completed/session-matching tracks', () => {
    const ranked = rankCandidates(candidates, session);
    const track1 = ranked.find(candidate => candidate.track.id === 'track-1');

    expect(track1?.scoreBreakdown.components.completionAffinity.raw).toBeGreaterThan(0);
    expect(track1?.reasons.some(reason => reason.type === 'completion_signal')).toBe(true);
  });

  it('penalizes skipped tracks and rejected directions', () => {
    const ranked = rankCandidates(candidates, session);
    const track2 = ranked.find(candidate => candidate.track.id === 'track-2');

    expect(track2?.scoreBreakdown.components.skipRisk.raw).toBeGreaterThan(0);
    expect(track2?.warnings.some(warning => warning.type === 'skip_risk')).toBe(true);
  });

  it('applies explicit positive feedback', () => {
    const ranked = rankCandidates(candidates, session);
    const track3 = ranked.find(candidate => candidate.track.id === 'track-3');

    expect(track3?.scoreBreakdown.components.explicitFeedback.raw).toBeGreaterThan(0);
    expect(track3?.reasons.some(reason => reason.type === 'explicit_feedback')).toBe(true);
  });

  it('applies recent repeat risk', () => {
    const ranked = rankCandidates(candidates, session);
    const track2 = ranked.find(candidate => candidate.track.id === 'track-2');

    expect(track2?.scoreBreakdown.components.recentRepeatRisk.raw).toBeGreaterThan(0);
    expect(track2?.warnings.some(warning => warning.type === 'recent_repeat')).toBe(true);
  });

  it('filters unavailable candidates before ranking', () => {
    const ranked = rankCandidates(
      [
        ...candidates,
        {
          track: {
            id: 'unavailable',
            title: 'Unavailable',
            artists: [{ id: 'artist-x', name: 'Artist X' }],
            durationMs: 120000,
            providerIds: { demo: 'demo:track:unavailable' },
          },
          source: 'demo_pool',
          generatedAt,
          unavailable: true,
        },
      ],
      session
    );

    expect(ranked.some(candidate => candidate.track.id === 'unavailable')).toBe(false);
  });
});
