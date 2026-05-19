import { describe, expect, it } from 'vitest';
import type { ObservedPlayback } from '@/services/mediaSessionCommands';
import { getPlaybackSourceLabel, inferPlaybackEvents } from './playbackEvents';

function observed(
  input: Partial<ObservedPlayback> = {}
): ObservedPlayback {
  return {
    source: 'windows_media_session',
    sourceAppId: 'Spotify.exe',
    title: 'Track A',
    artist: 'Artist A',
    albumTitle: 'Album A',
    playbackStatus: 'playing',
    positionMs: 1000,
    durationMs: 180000,
    observedAtMs: 1770000000000,
    ...input,
  };
}

describe('@trama/desktop - playback event inference', () => {
  it('infers observer_attached for the first observed snapshot', () => {
    const events = inferPlaybackEvents(null, observed());

    expect(events.map(event => event.type)).toEqual(['observer_attached']);
    expect(events[0].summary).toBe('Attached to Track A.');
  });

  it('does not create duplicate events for unchanged snapshots', () => {
    const events = inferPlaybackEvents(observed(), observed({ positionMs: 5000 }));

    expect(events).toEqual([]);
  });

  it('infers pause and resume changes for the same track', () => {
    const paused = inferPlaybackEvents(
      observed({ playbackStatus: 'playing' }),
      observed({ playbackStatus: 'paused', observedAtMs: 1770000002000 })
    );
    const resumed = inferPlaybackEvents(
      observed({ playbackStatus: 'paused' }),
      observed({ playbackStatus: 'playing', observedAtMs: 1770000004000 })
    );

    expect(paused.map(event => event.type)).toEqual(['track_paused']);
    expect(resumed.map(event => event.type)).toEqual(['track_resumed']);
  });

  it('infers track_started when the observed track identity changes', () => {
    const events = inferPlaybackEvents(
      observed({ title: 'Track A', positionMs: 9000 }),
      observed({ title: 'Track B', observedAtMs: 1770000006000 })
    );

    expect(events.map(event => event.type)).toEqual(['track_started']);
    expect(events[0].summary).toBe('Started Track B by Artist A.');
  });

  it('infers completion when the track changes near the end', () => {
    const events = inferPlaybackEvents(
      observed({ positionMs: 172000, durationMs: 180000 }),
      observed({ title: 'Track B', observedAtMs: 1770000008000 })
    );

    expect(events.map(event => event.type)).toEqual([
      'track_completed',
      'track_started',
    ]);
    expect(events[0].summary).toBe('Completed Track A at 2:52 / 3:00.');
    expect(events[0].confidence).toBe(0.95);
  });

  it('infers skip when the track changes early', () => {
    const events = inferPlaybackEvents(
      observed({ positionMs: 22000, durationMs: 180000 }),
      observed({ title: 'Track B', observedAtMs: 1770000010000 })
    );

    expect(events.map(event => event.type)).toEqual([
      'track_skipped',
      'track_started',
    ]);
    expect(events[0].summary).toBe('Skipped Track A at 0:22 / 3:00.');
    expect(events[0].confidence).toBe(0.9);
  });

  it('infers replay when a recently started track comes back', () => {
    const recentEvents = inferPlaybackEvents(null, observed({ title: 'Track A' }));
    const events = inferPlaybackEvents(
      observed({ title: 'Track B', positionMs: 9000 }),
      observed({ title: 'Track A', observedAtMs: 1770000012000 }),
      { recentEvents }
    );

    expect(events.map(event => event.type)).toEqual(['track_replayed']);
    expect(events[0].summary).toBe('Replayed Track A.');
  });

  it('shows Spotify as the friendly source label', () => {
    expect(
      getPlaybackSourceLabel(
        observed({ sourceAppId: 'SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify' })
      )
    ).toBe('Spotify');
  });
});
