import {
  createSpotifyClient,
  mapSpotifyTrackToTrack,
} from '@trama/spotify-adapter';
import type { CandidateTrack, RankedCandidate, Session } from '@trama/core';
import { rankCandidates } from '@trama/core';
import { loadUsableSpotifyToken } from '@/services/spotifyRuntime';

export interface SpotifyCandidatePoolResult {
  generatedAt: string;
  candidatePool: CandidateTrack[];
  rankedCandidates: RankedCandidate[];
  queuedTrackUris: string[];
  sourceSummary: {
    recentlyPlayedCount: number;
    playlistCount: number;
    playlistTrackCount: number;
  };
}

const recentlyPlayedTarget = 24;
const playlistCandidateTarget = 24;
const playlistFetchLimit = 8;
const playlistTrackFetchLimit = 20;

export async function buildRankedSpotifyCandidatePool(
  session: Session
): Promise<SpotifyCandidatePoolResult> {
  try {
    const token = await loadUsableSpotifyToken();
    const client = createSpotifyClient(token.accessToken);
    const generatedAt = new Date().toISOString();

    const [recentlyPlayedTracks, playlists, queuedTracks] = await Promise.all([
      client.getRecentlyPlayed(recentlyPlayedTarget),
      client.getCurrentUserPlaylists(playlistFetchLimit),
      client.getQueue(),
    ]);

    const playlistTracksByPlaylist = await Promise.all(
      playlists.map(async playlist => ({
        playlist,
        tracks: await client.getPlaylistTracks(playlist.id, playlistTrackFetchLimit),
      }))
    );

    const recentlyPlayedCandidates = recentlyPlayedTracks.map(track => ({
      track: mapSpotifyTrackToTrack(track, {
        source: 'provider_recently_played',
        observedAt: generatedAt,
      }),
      source: 'recently_played_relation' as const,
      sourceRefs: [{ type: 'event' as const, id: 'spotify-recently-played' }],
      generatedAt,
    }));

    const playlistCandidates = playlistTracksByPlaylist.flatMap(
      ({ playlist, tracks }) =>
        tracks.map(track => ({
          track: mapSpotifyTrackToTrack(track, {
            source: 'provider_playlist',
            observedAt: generatedAt,
          }),
          source: 'playlist_cooccurrence' as const,
          sourceRefs: [{ type: 'playlist' as const, id: playlist.id }],
          generatedAt,
        }))
    );

    const candidatePool = mergeCandidateSources({
      currentTrackId: session.currentTrackId,
      recentlyPlayedCandidates,
      playlistCandidates,
    });

    return {
      generatedAt,
      rankedCandidates: rankCandidates(candidatePool, session),
      candidatePool,
      queuedTrackUris: queuedTracks
        .map(track => track.uri)
        .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0),
      sourceSummary: {
        recentlyPlayedCount: recentlyPlayedTracks.length,
        playlistCount: playlists.length,
        playlistTrackCount: playlistTracksByPlaylist.reduce(
          (sum, item) => sum + item.tracks.length,
          0
        ),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('additional scopes')) {
      throw new Error(
        'Spotify rejected playlist access. Re-authenticate so Trama can request playlist-read scopes.'
      );
    }

    throw error;
  }
}

interface MergeCandidateSourcesInput {
  currentTrackId?: string;
  recentlyPlayedCandidates: CandidateTrack[];
  playlistCandidates: CandidateTrack[];
}

export function mergeCandidateSources(
  input: MergeCandidateSourcesInput
): CandidateTrack[] {
  const mergedByTrackId = new Map<string, CandidateTrack>();
  const result: CandidateTrack[] = [];

  const recentQueue = dedupeCandidates(
    input.recentlyPlayedCandidates,
    input.currentTrackId
  ).slice(0, recentlyPlayedTarget);
  const playlistQueue = dedupeCandidates(
    input.playlistCandidates,
    input.currentTrackId
  ).slice(0, playlistCandidateTarget);

  let recentIndex = 0;
  let playlistIndex = 0;

  while (
    recentIndex < recentQueue.length ||
    playlistIndex < playlistQueue.length
  ) {
    const nextRecent = recentQueue[recentIndex];
    if (nextRecent) {
      recentIndex += 1;
      pushMergedCandidate(mergedByTrackId, result, nextRecent);
    }

    const nextPlaylist = playlistQueue[playlistIndex];
    if (nextPlaylist) {
      playlistIndex += 1;
      pushMergedCandidate(mergedByTrackId, result, nextPlaylist);
    }
  }

  return result;
}

function dedupeCandidates(
  candidates: CandidateTrack[],
  currentTrackId?: string
): CandidateTrack[] {
  const seen = new Set<string>();
  const result: CandidateTrack[] = [];

  for (const candidate of candidates) {
    if (candidate.track.id === currentTrackId) {
      continue;
    }

    if (seen.has(candidate.track.id)) {
      continue;
    }

    seen.add(candidate.track.id);
    result.push(candidate);
  }

  return result;
}

function pushMergedCandidate(
  mergedByTrackId: Map<string, CandidateTrack>,
  ordered: CandidateTrack[],
  candidate: CandidateTrack
): void {
  const existing = mergedByTrackId.get(candidate.track.id);
  if (!existing) {
    const next = cloneCandidate(candidate);
    mergedByTrackId.set(candidate.track.id, next);
    ordered.push(next);
    return;
  }

  existing.sourceRefs = mergeSourceRefs(existing.sourceRefs, candidate.sourceRefs);
  if (
    existing.source !== 'playlist_cooccurrence' &&
    candidate.source === 'playlist_cooccurrence'
  ) {
    existing.source = candidate.source;
  }
}

function mergeSourceRefs(
  left: CandidateTrack['sourceRefs'],
  right: CandidateTrack['sourceRefs']
): CandidateTrack['sourceRefs'] {
  const allRefs = [...(left ?? []), ...(right ?? [])];
  const seen = new Set<string>();

  return allRefs.filter(ref => {
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function cloneCandidate(candidate: CandidateTrack): CandidateTrack {
  return {
    ...candidate,
    track: {
      ...candidate.track,
      providerIds: { ...candidate.track.providerIds },
      artists: candidate.track.artists.map(artist => ({
        ...artist,
        providerIds: artist.providerIds ? { ...artist.providerIds } : undefined,
      })),
      album: candidate.track.album
        ? {
            ...candidate.track.album,
            providerIds: candidate.track.album.providerIds
              ? { ...candidate.track.album.providerIds }
              : undefined,
          }
        : undefined,
      tags: candidate.track.tags ? [...candidate.track.tags] : undefined,
    },
    sourceRefs: candidate.sourceRefs ? [...candidate.sourceRefs] : undefined,
  };
}
