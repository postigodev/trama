import { describe, expect, it } from 'vitest';
import type { CandidateTrack, Track } from '@trama/core';
import { mergeCandidateSources } from './spotifyCandidatePool';

function track(id: string, title = id): Track {
  return {
    id,
    providerIds: { spotify: `spotify:track:${id}` },
    title,
    artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
    durationMs: 180000,
  };
}

function candidate(
  id: string,
  source: CandidateTrack['source'],
  sourceRefId: string
): CandidateTrack {
  return {
    track: track(id),
    source,
    sourceRefs: [{ type: source === 'playlist_cooccurrence' ? 'playlist' : 'event', id: sourceRefId }],
    generatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('@trama/desktop - spotify candidate pool', () => {
  it('interleaves recently played and playlist candidates with dedupe', () => {
    const merged = mergeCandidateSources({
      currentTrackId: 'track-current',
      recentlyPlayedCandidates: [
        candidate('track-a', 'recently_played_relation', 'recent'),
        candidate('track-b', 'recently_played_relation', 'recent'),
      ],
      playlistCandidates: [
        candidate('track-b', 'playlist_cooccurrence', 'playlist-1'),
        candidate('track-c', 'playlist_cooccurrence', 'playlist-2'),
      ],
    });

    expect(merged.map(item => item.track.id)).toEqual([
      'track-a',
      'track-b',
      'track-c',
    ]);
    expect(merged[1]?.source).toBe('playlist_cooccurrence');
    expect(merged[1]?.sourceRefs).toHaveLength(2);
    expect(merged[1]?.sourceRefs).toEqual(
      expect.arrayContaining([
        { type: 'event', id: 'recent' },
        { type: 'playlist', id: 'playlist-1' },
      ])
    );
  });
});
