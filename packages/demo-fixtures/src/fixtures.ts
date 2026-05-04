/**
 * Mock tracks and candidate pools for demo mode
 */

import type { CandidateTrack } from '../../core/src/types';

export const mockTracks: CandidateTrack[] = [
  {
    id: 'late-1',
    title: 'Midnight Echo',
    artist: 'Luna & Waves',
    duration: 243,
    providerIds: { spotify: 'spotify:track:late-1' },
  },
  {
    id: 'late-2',
    title: 'Neon Haze',
    artist: 'Luna & Waves',
    duration: 251,
    providerIds: { spotify: 'spotify:track:late-2' },
  },
  {
    id: 'gym-1',
    title: 'Urban Flow',
    artist: 'City Beats',
    duration: 187,
    providerIds: { spotify: 'spotify:track:gym-1' },
  },
  {
    id: 'gym-2',
    title: 'Sprint Pulse',
    artist: 'Pulse Reactor',
    duration: 196,
    providerIds: { spotify: 'spotify:track:gym-2' },
  },
  {
    id: 'study-1',
    title: 'Soft Glow',
    artist: 'Ambient Dreams',
    duration: 312,
    providerIds: { spotify: 'spotify:track:study-1' },
  },
  {
    id: 'study-2',
    title: 'Focus Drift',
    artist: 'Quiet Current',
    duration: 289,
    providerIds: { spotify: 'spotify:track:study-2' },
  },
  {
    id: 'break-1',
    title: 'Shatter Drop',
    artist: 'Noise Vessel',
    duration: 205,
    providerIds: { spotify: 'spotify:track:break-1' },
  },
  {
    id: 'break-2',
    title: 'Erratic Cut',
    artist: 'Glitch Unit',
    duration: 198,
    providerIds: { spotify: 'spotify:track:break-2' },
  },
];

export function getCandidatePool(): CandidateTrack[] {
  return [...mockTracks];
}

export function getTracksByPrefix(prefix: string): CandidateTrack[] {
  return mockTracks.filter(track => track.id.startsWith(prefix));
}
