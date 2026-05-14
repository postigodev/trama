/**
 * Demo tracks and candidate pools for contributor/test mode.
 */

import type { CandidateTrack, Track } from '../../core/src/types';

const generatedAt = '2026-01-01T00:00:00.000Z';

export const mockTracks: Track[] = [
  {
    id: 'late-1',
    title: 'Midnight Echo',
    artists: [{ id: 'artist-luna-waves', name: 'Luna & Waves' }],
    durationMs: 243000,
    popularity: 42,
    providerIds: { demo: 'demo:track:late-1', spotify: 'spotify:track:late-1' },
    tags: ['late-night', 'melodic', 'dark', 'synth'],
    source: 'demo_fixture',
  },
  {
    id: 'late-2',
    title: 'Neon Haze',
    artists: [{ id: 'artist-luna-waves', name: 'Luna & Waves' }],
    durationMs: 251000,
    popularity: 45,
    providerIds: { demo: 'demo:track:late-2', spotify: 'spotify:track:late-2' },
    tags: ['late-night', 'melodic', 'dark', 'synth'],
    source: 'demo_fixture',
  },
  {
    id: 'gym-1',
    title: 'Urban Flow',
    artists: [{ id: 'artist-city-beats', name: 'City Beats' }],
    durationMs: 187000,
    popularity: 65,
    providerIds: { demo: 'demo:track:gym-1', spotify: 'spotify:track:gym-1' },
    tags: ['gym', 'high-energy', 'percussive'],
    source: 'demo_fixture',
  },
  {
    id: 'gym-2',
    title: 'Sprint Pulse',
    artists: [{ id: 'artist-pulse-reactor', name: 'Pulse Reactor' }],
    durationMs: 196000,
    popularity: 58,
    providerIds: { demo: 'demo:track:gym-2', spotify: 'spotify:track:gym-2' },
    tags: ['gym', 'high-energy', 'percussive'],
    source: 'demo_fixture',
  },
  {
    id: 'study-1',
    title: 'Soft Glow',
    artists: [{ id: 'artist-ambient-dreams', name: 'Ambient Dreams' }],
    durationMs: 312000,
    popularity: 35,
    providerIds: { demo: 'demo:track:study-1', spotify: 'spotify:track:study-1' },
    tags: ['study', 'ambient', 'low-pressure'],
    source: 'demo_fixture',
  },
  {
    id: 'study-2',
    title: 'Focus Drift',
    artists: [{ id: 'artist-quiet-current', name: 'Quiet Current' }],
    durationMs: 289000,
    popularity: 32,
    providerIds: { demo: 'demo:track:study-2', spotify: 'spotify:track:study-2' },
    tags: ['study', 'ambient', 'low-pressure'],
    source: 'demo_fixture',
  },
  {
    id: 'break-1',
    title: 'Shatter Drop',
    artists: [{ id: 'artist-noise-vessel', name: 'Noise Vessel' }],
    durationMs: 205000,
    popularity: 72,
    providerIds: { demo: 'demo:track:break-1', spotify: 'spotify:track:break-1' },
    tags: ['abrasive', 'bright', 'drop'],
    source: 'demo_fixture',
  },
  {
    id: 'break-2',
    title: 'Erratic Cut',
    artists: [{ id: 'artist-glitch-unit', name: 'Glitch Unit' }],
    durationMs: 198000,
    popularity: 78,
    providerIds: { demo: 'demo:track:break-2', spotify: 'spotify:track:break-2' },
    tags: ['abrasive', 'bright', 'drop'],
    source: 'demo_fixture',
  },
];

export function toCandidate(
  track: Track,
  source: CandidateTrack['source'] = 'demo_pool'
): CandidateTrack {
  return {
    track,
    source,
    generatedAt,
  };
}

export function getCandidatePool(): CandidateTrack[] {
  return mockTracks.map(track => toCandidate(track));
}

export function getTracksByPrefix(prefix: string): Track[] {
  return mockTracks.filter(track => track.id.startsWith(prefix));
}

export function getTrackById(id: string): Track {
  const track = mockTracks.find(item => item.id === id);
  if (!track) {
    throw new Error(`Track not found for fixture: ${id}`);
  }
  return track;
}
