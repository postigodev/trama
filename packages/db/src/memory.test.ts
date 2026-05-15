import { describe, expect, it } from 'vitest';
import { createSession, deriveSessionFromEvents } from '../../core/src/session';
import type { FeedbackEvent, PlayEvent, Track } from '../../core/src/types';
import { createInMemoryRepositories } from './memory';

const trackA: Track = {
  id: 'track-a',
  title: 'Track A',
  artists: [{ id: 'artist-a', name: 'Artist A' }],
  durationMs: 180000,
  providerIds: { demo: 'demo:track-a' },
  tags: ['late-night', 'melodic'],
};

const trackB: Track = {
  id: 'track-b',
  title: 'Track B',
  artists: [{ id: 'artist-b', name: 'Artist B' }],
  durationMs: 200000,
  providerIds: { demo: 'demo:track-b' },
  tags: ['abrasive', 'bright'],
};

describe('@trama/db - in-memory repositories', () => {
  it('stores and returns defensive copies of sessions', async () => {
    const repos = createInMemoryRepositories();
    const session = createSession(
      'session-1',
      new Date('2026-01-01T00:00:00.000Z')
    );

    const created = await repos.sessions.create({ session });
    created.recentTrackIds.push('mutated-outside');

    const found = await repos.sessions.findById('session-1');

    expect(found?.id).toBe('session-1');
    expect(found?.recentTrackIds).toEqual([]);
  });

  it('upserts and finds tracks by id', async () => {
    const repos = createInMemoryRepositories();

    await repos.tracks.upsert(trackA);
    await repos.tracks.upsert(trackB);

    const found = await repos.tracks.findById('track-a');
    const many = await repos.tracks.findManyByIds(['track-b', 'missing']);

    expect(found?.title).toBe('Track A');
    expect(many.map(track => track.id)).toEqual(['track-b']);
  });

  it('appends and lists play events in chronological order', async () => {
    const repos = createInMemoryRepositories();
    const lateEvent: PlayEvent = {
      id: 'event-2',
      sessionId: 'session-1',
      trackId: 'track-b',
      type: 'track_skipped',
      occurredAt: '2026-01-01T00:02:00.000Z',
      inferred: true,
    };
    const earlyEvent: PlayEvent = {
      id: 'event-1',
      sessionId: 'session-1',
      trackId: 'track-a',
      type: 'track_completed',
      occurredAt: '2026-01-01T00:01:00.000Z',
      inferred: true,
    };

    await repos.events.appendPlayEvent(lateEvent);
    await repos.events.appendPlayEvent(earlyEvent);

    const events = await repos.events.listPlayEventsForSession('session-1');

    expect(events.map(event => event.id)).toEqual(['event-1', 'event-2']);
  });

  it('appends and lists feedback events in chronological order', async () => {
    const repos = createInMemoryRepositories();
    const feedbackEvents: FeedbackEvent[] = [
      {
        id: 'feedback-2',
        sessionId: 'session-1',
        trackId: 'track-b',
        type: 'broke_the_mood',
        occurredAt: '2026-01-01T00:04:00.000Z',
      },
      {
        id: 'feedback-1',
        sessionId: 'session-1',
        trackId: 'track-a',
        type: 'more_like_this',
        occurredAt: '2026-01-01T00:03:00.000Z',
      },
    ];

    for (const event of feedbackEvents) {
      await repos.events.appendFeedbackEvent(event);
    }

    const events = await repos.events.listFeedbackEventsForSession('session-1');

    expect(events.map(event => event.id)).toEqual(['feedback-1', 'feedback-2']);
  });

  it('provides events that core can use to derive session state', async () => {
    const repos = createInMemoryRepositories();
    const session = createSession(
      'session-1',
      new Date('2026-01-01T00:00:00.000Z')
    );

    await repos.sessions.create({ session });
    await repos.tracks.upsert(trackA);
    await repos.tracks.upsert(trackB);
    await repos.events.appendPlayEvent({
      id: 'event-1',
      sessionId: 'session-1',
      trackId: 'track-a',
      type: 'track_completed',
      occurredAt: '2026-01-01T00:01:00.000Z',
      inferred: true,
    });
    await repos.events.appendFeedbackEvent({
      id: 'feedback-1',
      sessionId: 'session-1',
      trackId: 'track-b',
      type: 'less_like_this',
      occurredAt: '2026-01-01T00:02:00.000Z',
    });

    const baseSession = await repos.sessions.findById('session-1');
    const playEvents = await repos.events.listPlayEventsForSession('session-1');
    const feedbackEvents =
      await repos.events.listFeedbackEventsForSession('session-1');
    const derived = deriveSessionFromEvents({
      baseSession: baseSession!,
      playEvents,
      feedbackEvents,
      getTrack: trackId => {
        if (trackId === 'track-a') return trackA;
        if (trackId === 'track-b') return trackB;
        return undefined;
      },
    });

    expect(derived.completedTrackIds).toEqual(['track-a']);
    expect(derived.feedbackByTrack['track-b']).toEqual(['less_like_this']);
    expect(derived.acceptedArtistIds).toContain('artist-a');
    expect(derived.rejectedArtistIds).toContain('artist-b');
  });
});
