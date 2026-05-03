/**
 * Mock tracks and candidate pools for demo mode
 */

import type { CandidateTrack } from '@trama/core';

export const mockTracks: CandidateTrack[] = [
  {
    id: 'track-1',
    title: 'Midnight Echo',
    artist: 'Luna & Waves',
    duration: 243,
    providerIds: { spotify: 'spotify:track:track-1' },
  },
  {
    id: 'track-2',
    title: 'Urban Flow',
    artist: 'City Beats',
    duration: 187,
    providerIds: { spotify: 'spotify:track:track-2' },
  },
  {
    id: 'track-3',
    title: 'Soft Glow',
    artist: 'Ambient Dreams',
    duration: 312,
    providerIds: { spotify: 'spotify:track:track-3' },
  },
];

export function getCandidatePool(): CandidateTrack[] {
  return [...mockTracks];
}
