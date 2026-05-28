/**
 * Trama Desktop App
 * Main entry point
 */

import React, { useEffect, useRef, useState } from 'react';
import { Activity, Headphones, Radio, RotateCcw } from 'lucide-react';
import type { FeedbackType, RankedCandidate, Session } from '@trama/core';
import { createSpotifyClient, type PlaybackState } from '@trama/spotify-adapter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LiamPanel } from '@/components/LiamPanel';
import { EventTimeline } from '@/components/EventTimeline';
import { SpotifyAuthLab } from '@/components/SpotifyAuthLab';
import { UpNextPanel } from '@/components/UpNextPanel';
import { WaveformBars } from '@/components/WaveformBars';
import { createSpotifyAutopilotController } from '@/services/autopilot';
import {
  getCurrentMediaSession,
  type ObservedPlayback,
} from '@/services/mediaSessionCommands';
import {
  inferPlaybackEvents,
  type PlaybackEvent,
} from '@/services/playbackEvents';
import {
  createLocalSessionRecorder,
  type LocalSessionRecorder,
} from '@/services/localSessionRecorder';
import { buildRankedSpotifyCandidatePool } from '@/services/spotifyCandidatePool';
import { loadUsableSpotifyToken } from '@/services/spotifyRuntime';
import {
  createDesktopRepositories,
  getLocalDbStatus,
} from '@/services/tauriRepositories';

const localSessionId = 'local-personal-session';

export function App(): React.JSX.Element {
  const [connected, setConnected] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [observedPlayback, setObservedPlayback] =
    useState<ObservedPlayback | null>(null);
  const [localObserverError, setLocalObserverError] = useState<string | null>(
    null
  );
  const [readingLocalSession, setReadingLocalSession] = useState(false);
  const [localObserverEnabled, setLocalObserverEnabled] = useState(true);
  const [playbackEvents, setPlaybackEvents] = useState<PlaybackEvent[]>([]);
  const [localSession, setLocalSession] = useState<Session | null>(null);
  const [localDbPath, setLocalDbPath] = useState<string | null>(null);
  const [liamBusy, setLiamBusy] = useState(false);
  const [liamStatusMessage, setLiamStatusMessage] = useState<string | null>(null);
  const [candidatePoolBusy, setCandidatePoolBusy] = useState(false);
  const [candidatePoolStatus, setCandidatePoolStatus] = useState<string | null>(null);
  const [rankedCandidates, setRankedCandidates] = useState<RankedCandidate[]>([]);
  const [queueCandidateBusy, setQueueCandidateBusy] = useState(false);
  const [queuedTrackUris, setQueuedTrackUris] = useState<string[]>([]);
  const [candidateSourceSummary, setCandidateSourceSummary] = useState<{
    recentlyPlayedCount: number;
    playlistCount: number;
    playlistTrackCount: number;
  } | null>(null);
  const localSessionRef = useRef<Session | null>(null);
  const queuedTrackUrisRef = useRef<string[]>([]);
  const observedPlaybackRef = useRef<ObservedPlayback | null>(null);
  const playbackEventsRef = useRef<PlaybackEvent[]>([]);
  const autopilotRunningRef = useRef(false);
  const sessionRecorderRef = useRef<LocalSessionRecorder | null>(null);
  if (!sessionRecorderRef.current) {
    sessionRecorderRef.current = createLocalSessionRecorder({
      repositories: createDesktopRepositories(),
      sessionId: localSessionId,
    });
  }
  const autopilotControllerRef = useRef<ReturnType<
    typeof createSpotifyAutopilotController
  > | null>(null);
  if (!autopilotControllerRef.current) {
    autopilotControllerRef.current = createSpotifyAutopilotController({
      buildCandidatePool: buildRankedSpotifyCandidatePool,
      queueSpotifyTrack: async spotifyUri => {
        const token = await loadUsableSpotifyToken();
        await createSpotifyClient(token.accessToken).addToQueue(spotifyUri);
      },
      recordCandidateQueued: async (candidate, occurredAtMs) => {
        const sessionRecorder = sessionRecorderRef.current;
        if (!sessionRecorder) {
          throw new Error('Autopilot recorder is not ready yet.');
        }

        return sessionRecorder.recordCandidateQueued({
          candidate,
          occurredAtMs,
          source: 'desktop_autopilot',
        });
      },
    });
  }
  const hasTrack = Boolean(playback?.track);
  const hasObservedTrack = hasTrack || Boolean(observedPlayback?.title);
  const displayTitle =
    playback?.track?.title ?? observedPlayback?.title ?? 'No track selected';
  const displayArtist =
    playback?.track?.artists.map(artist => artist.name).join(', ') ??
    observedPlayback?.artist ??
    'Start Spotify playback, then ask Trama to observe it.';
  const displayStatus =
    playback?.isPlaying === true
      ? 'Playing'
      : playback?.isPlaying === false
        ? 'Paused'
        : observedPlayback?.playbackStatus ?? 'idle';
  const displayProgress =
    typeof playback?.progressMs === 'number'
      ? playback.progressMs
      : observedPlayback?.positionMs;
  const displayDuration = playback?.durationMs ?? observedPlayback?.durationMs;

  function syncLocalSession(session: Session | null): void {
    localSessionRef.current = session;
    setLocalSession(session);
  }

  function syncQueuedTrackUris(nextUris: string[]): void {
    const uniqueUris = [...new Set(nextUris)];
    queuedTrackUrisRef.current = uniqueUris;
    setQueuedTrackUris(uniqueUris);
  }

  function applyCandidatePoolSnapshot(input: {
    rankedCandidates: RankedCandidate[];
    queuedTrackUris: string[];
    sourceSummary: {
      recentlyPlayedCount: number;
      playlistCount: number;
      playlistTrackCount: number;
    };
  }): void {
    setRankedCandidates(input.rankedCandidates);
    syncQueuedTrackUris(input.queuedTrackUris);
    setCandidateSourceSummary(input.sourceSummary);
  }

  async function queueCandidateOnSpotify(
    candidate: RankedCandidate,
    source: 'desktop_up_next' | 'desktop_autopilot'
  ): Promise<Session> {
    const sessionRecorder = sessionRecorderRef.current;
    const spotifyUri = candidate.track.providerIds.spotify;

    if (!sessionRecorder) {
      throw new Error('Session recorder is not ready yet.');
    }

    if (!spotifyUri) {
      throw new Error(
        `Can't queue "${candidate.track.title}" because it has no Spotify URI.`
      );
    }

    if (queuedTrackUrisRef.current.includes(spotifyUri)) {
      throw new Error(`"${candidate.track.title}" is already in the Spotify queue.`);
    }

    const token = await loadUsableSpotifyToken();
    await createSpotifyClient(token.accessToken).addToQueue(spotifyUri);
    const result = await sessionRecorder.recordCandidateQueued({
      candidate,
      source,
    });
    syncLocalSession(result.session);
    syncQueuedTrackUris([...queuedTrackUrisRef.current, spotifyUri]);
    return result.session;
  }

  async function maybeRunAutopilot(
    nextPlayback: ObservedPlayback | null,
    session: Session | null
  ): Promise<void> {
    const controller = autopilotControllerRef.current;
    if (
      !controller ||
      autopilotRunningRef.current ||
      queueCandidateBusy ||
      candidatePoolBusy ||
      liamBusy
    ) {
      return;
    }

    autopilotRunningRef.current = true;

    try {
      const result = await controller.run({
        session,
        observedPlayback: nextPlayback,
      });

      if (result.rankedCandidates && result.queuedTrackUris && result.sourceSummary) {
        applyCandidatePoolSnapshot({
          rankedCandidates: result.rankedCandidates,
          queuedTrackUris: result.queuedTrackUris,
          sourceSummary: result.sourceSummary,
        });
      }

      if (result.session) {
        syncLocalSession(result.session);
      }

      if (result.message) {
        setLiamStatusMessage(result.message);
        if (result.status !== 'idle') {
          setCandidatePoolStatus(result.message);
        }
      }
    } finally {
      autopilotRunningRef.current = false;
    }
  }

  async function readLocalMediaSession(): Promise<void> {
    setReadingLocalSession(true);
    setLocalObserverError(null);

    try {
      const previous = observedPlaybackRef.current;
      const next = await getCurrentMediaSession();
      observedPlaybackRef.current = next;
      setObservedPlayback(next);
      let session = localSessionRef.current;

      const newEvents = inferPlaybackEvents(previous, next, {
        recentEvents: playbackEventsRef.current,
      });
      if (newEvents.length > 0) {
        const sessionRecorder = sessionRecorderRef.current;
        if (!sessionRecorder) return;

        const updatedEvents = [...newEvents, ...playbackEventsRef.current]
          .sort((a, b) => b.observedAtMs - a.observedAtMs)
          .slice(0, 12);
        playbackEventsRef.current = updatedEvents;
        setPlaybackEvents(updatedEvents);
        session = await sessionRecorder.recordEvents(newEvents);
        syncLocalSession(session);
      }

      await maybeRunAutopilot(next, session);
    } catch (error) {
      setLocalObserverError(error instanceof Error ? error.message : String(error));
    } finally {
      setReadingLocalSession(false);
    }
  }

  async function handleFeedback(type: FeedbackType): Promise<void> {
    const sessionRecorder = sessionRecorderRef.current;
    const trackId = localSession?.currentTrackId;

    if (!sessionRecorder || !trackId) {
      setLiamStatusMessage('No active session track yet. Start playback and observe it first.');
      return;
    }

    setLiamBusy(true);
    setLiamStatusMessage(null);

    try {
      const result = await sessionRecorder.recordFeedback({
        trackId,
        type,
      });
      syncLocalSession(result.session);
      setLiamStatusMessage(
        buildFeedbackStatusMessage(type, displayTitle, result.session)
      );
    } catch (error) {
      setLiamStatusMessage(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setLiamBusy(false);
    }
  }

  async function handleToggleAutopilot(): Promise<void> {
    const sessionRecorder = sessionRecorderRef.current;
    if (!sessionRecorder) {
      return;
    }

    setLiamBusy(true);
    setLiamStatusMessage(null);

    try {
      const nextEnabled = !localSession?.controls.autopilotEnabled;
      const result = await sessionRecorder.recordAutopilotChange(nextEnabled);
      syncLocalSession(result.session);
      setLiamStatusMessage(
        nextEnabled
          ? 'Autopilot enabled. Future queue actions should be recorded visibly.'
          : 'Autopilot disabled. Liam is back to observation mode.'
      );
    } catch (error) {
      setLiamStatusMessage(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setLiamBusy(false);
    }
  }

  async function handleBuildCandidatePool(): Promise<void> {
    if (!localSession) {
      setCandidatePoolStatus(
        'No local session yet. Observe playback first so Trama has context.'
      );
      return;
    }

    setCandidatePoolBusy(true);
    setCandidatePoolStatus(null);

    try {
      const result = await buildRankedSpotifyCandidatePool(localSession);
      applyCandidatePoolSnapshot(result);
      setCandidatePoolStatus(
        `Built ${result.candidatePool.length} candidates from ${result.sourceSummary.recentlyPlayedCount} recent tracks and ${result.sourceSummary.playlistCount} playlists. Queue has ${result.queuedTrackUris.length} item${result.queuedTrackUris.length === 1 ? '' : 's'}.`
      );
    } catch (error) {
      setCandidatePoolStatus(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setCandidatePoolBusy(false);
    }
  }

  async function handleQueueCandidate(candidate: RankedCandidate): Promise<void> {
    const spotifyUri = candidate.track.providerIds.spotify;

    if (!spotifyUri) {
      setCandidatePoolStatus(
        `Can't queue "${candidate.track.title}" because it has no Spotify URI.`
      );
      return;
    }

    if (queuedTrackUrisRef.current.includes(spotifyUri)) {
      setCandidatePoolStatus(`"${candidate.track.title}" is already in the Spotify queue.`);
      return;
    }

    setQueueCandidateBusy(true);
    setCandidatePoolStatus(null);

    try {
      await queueCandidateOnSpotify(candidate, 'desktop_up_next');
      setCandidatePoolStatus(
        `Queued "${candidate.track.title}" on Spotify from Up Next.`
      );
    } catch (error) {
      setCandidatePoolStatus(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setQueueCandidateBusy(false);
    }
  }

  async function handleQueueTopCandidate(): Promise<void> {
    const topCandidate = rankedCandidates[0];
    if (!topCandidate) {
      setCandidatePoolStatus('Build a candidate pool first so Liam has something to queue.');
      return;
    }

    await handleQueueCandidate(topCandidate);
  }

  useEffect(() => {
    let cancelled = false;
    const sessionRecorder = sessionRecorderRef.current;

    if (!sessionRecorder) {
      return undefined;
    }

    void (async () => {
      try {
        const [persistedState, dbStatus] = await Promise.all([
          sessionRecorder.hydratePersistedState(),
          getLocalDbStatus(),
        ]);
        if (cancelled) {
          return;
        }

        playbackEventsRef.current = persistedState.playbackEvents;
        setPlaybackEvents(persistedState.playbackEvents);
        syncLocalSession(persistedState.session);
        setLocalDbPath(dbStatus?.dbPath ?? null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLocalObserverError(
          error instanceof Error ? error.message : String(error)
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!localObserverEnabled) {
      return undefined;
    }

    void readLocalMediaSession();
    const intervalId = window.setInterval(() => {
      void readLocalMediaSession();
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [localObserverEnabled]);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-normal">Trama</h1>
                <Badge variant="outline">Session console</Badge>
                <Badge variant={connected ? 'secondary' : 'outline'}>
                  {connected ? 'Spotify connected' : 'Spotify disconnected'}
                </Badge>
                <Badge variant={observedPlayback ? 'secondary' : 'outline'}>
                  {observedPlayback ? 'Local observer ready' : 'Local observer idle'}
                </Badge>
                <Badge variant={localObserverEnabled ? 'secondary' : 'outline'}>
                  {localObserverEnabled ? 'Observer loop on' : 'Observer loop off'}
                </Badge>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Local-first adaptive queue engine. First we observe the session,
                then we rank what belongs next.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity data-icon="inline-start" />
              <span>
                {hasObservedTrack
                  ? 'Live playback observed'
                  : 'Waiting for playback'}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[220px_1fr_260px]">
            <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-3">
              {playback?.track?.artworkUrl ? (
                <img
                  src={playback.track.artworkUrl}
                  alt=""
                  className="aspect-square w-full max-w-44 rounded-lg object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full max-w-44 items-center justify-center rounded-lg border bg-background">
                  <Headphones />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-between gap-4 rounded-lg border bg-muted/20 p-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-normal text-muted-foreground">
                  Now Playing
                </p>
                <h2 className="truncate text-2xl font-semibold">
                  {displayTitle}
                </h2>
                <p className="truncate text-sm text-muted-foreground">
                  {displayArtist}
                </p>
                {typeof displayProgress === 'number' &&
                typeof displayDuration === 'number' ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDuration(displayProgress)} of{' '}
                    {formatDuration(displayDuration)}
                  </p>
                ) : null}
              </div>

              <WaveformBars
                active={
                  playback?.isPlaying === true ||
                  observedPlayback?.playbackStatus === 'playing'
                }
              />
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Radio data-icon="inline-start" />
                <span className="text-sm font-medium">Session State</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={playback?.isPlaying ? 'default' : 'outline'}>
                  {displayStatus}
                </Badge>
                <Badge variant="outline">
                  {playback?.device?.name ?? 'No active device'}
                </Badge>
                <Badge variant="outline">
                  {observedPlayback?.source ?? 'No local source'}
                </Badge>
                <Badge variant="outline">
                  {localSession
                    ? `${localSession.recentTrackIds.length} recent`
                    : 'No session yet'}
                </Badge>
                <Badge variant={localDbPath ? 'secondary' : 'outline'}>
                  {localDbPath ? 'Persistent session on' : 'Session persistence off'}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                {localSession?.currentTrackId ? (
                  <span className="truncate">
                    Current session track: {localSession.currentTrackId}
                  </span>
                ) : null}
                {localSession ? (
                  <span>
                    Completed {localSession.completedTrackIds.length} · Skipped{' '}
                    {localSession.skippedTrackIds.length} · Replayed{' '}
                    {localSession.replayedTrackIds.length}
                  </span>
                ) : null}
                {observedPlayback?.sourceAppId ? (
                  <span className="truncate">
                    Source app: {observedPlayback.sourceAppId}
                  </span>
                ) : null}
                {localDbPath ? (
                  <span className="truncate">Local DB: {localDbPath}</span>
                ) : null}
                {localObserverError ? (
                  <span>{localObserverError}</span>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={readLocalMediaSession}
                  disabled={readingLocalSession}
                >
                  <RotateCcw data-icon="inline-start" />
                  Read local session
                </Button>
                <Button
                  variant={localObserverEnabled ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setLocalObserverEnabled(enabled => !enabled)}
                >
                  {localObserverEnabled ? 'Stop observer' : 'Start observer'}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[320px_1fr_320px]">
          <div className="flex flex-col gap-4">
            <LiamPanel
              connected={connected}
              hasPlayback={hasObservedTrack}
              session={localSession}
              currentTrackTitle={displayTitle}
              canFeedback={Boolean(localSession?.currentTrackId)}
              busy={liamBusy}
              statusMessage={liamStatusMessage}
              onFeedback={handleFeedback}
              onToggleAutopilot={handleToggleAutopilot}
            />
            <UpNextPanel
              rankedCandidates={rankedCandidates}
              queuedTrackUris={queuedTrackUris}
              busy={candidatePoolBusy}
              queueBusy={queueCandidateBusy}
              statusMessage={candidatePoolStatus}
              onRefresh={handleBuildCandidatePool}
              onQueueTopCandidate={handleQueueTopCandidate}
              onQueueCandidate={handleQueueCandidate}
              sourceSummary={candidateSourceSummary}
            />
          </div>

          <SpotifyAuthLab
            className="xl:min-h-[720px]"
            onConnectionChange={setConnected}
            onPlaybackChange={setPlayback}
          />

          <div className="flex flex-col gap-4">
            <EventTimeline events={playbackEvents} />
            <Card>
              <CardHeader>
                <CardTitle>Manual Test Notes</CardTitle>
                <CardDescription>
                  Use this panel to keep real Spotify testing grounded.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                <p>1. Start playback in Spotify.</p>
                <p>2. Watch the local observer timeline.</p>
                <p>3. Pause, resume, and skip tracks.</p>
                <p>4. Compare local observations with Now playing.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function buildFeedbackStatusMessage(
  type: FeedbackType,
  title: string,
  session: Session
): string {
  switch (type) {
    case 'fire':
      return `Marked "${title}" as Fire. Accepted artists now influence this session more strongly.`;
    case 'more_like_this':
      return `Marked "${title}" as More like this. Similar tracks should feel safer next.`;
    case 'less_like_this':
      return `Marked "${title}" as Less like this. Liam will push away from this track's lane.`;
    case 'broke_the_mood':
      return `Marked "${title}" as Broke the mood. Mood strictness is now ${Math.round(
        session.controls.moodStrictness * 100
      )}%.`;
    default:
      return `Recorded ${type} for "${title}".`;
  }
}
