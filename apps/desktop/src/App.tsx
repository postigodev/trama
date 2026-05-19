/**
 * Trama Desktop App
 * Main entry point
 */

import React, { useEffect, useRef, useState } from 'react';
import { Activity, Headphones, Radio, RotateCcw } from 'lucide-react';
import type { PlaybackState } from '@trama/spotify-adapter';
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
import {
  getCurrentMediaSession,
  type ObservedPlayback,
} from '@/services/mediaSessionCommands';
import {
  inferPlaybackEvents,
  type PlaybackEvent,
} from '@/services/playbackEvents';

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
  const observedPlaybackRef = useRef<ObservedPlayback | null>(null);
  const playbackEventsRef = useRef<PlaybackEvent[]>([]);
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

  async function readLocalMediaSession(): Promise<void> {
    setReadingLocalSession(true);
    setLocalObserverError(null);

    try {
      const previous = observedPlaybackRef.current;
      const next = await getCurrentMediaSession();
      observedPlaybackRef.current = next;
      setObservedPlayback(next);

      const newEvents = inferPlaybackEvents(previous, next, {
        recentEvents: playbackEventsRef.current,
      });
      if (newEvents.length > 0) {
        const updatedEvents = [...newEvents, ...playbackEventsRef.current].slice(
          0,
          12
        );
        playbackEventsRef.current = updatedEvents;
        setPlaybackEvents(updatedEvents);
      }
    } catch (error) {
      setLocalObserverError(error instanceof Error ? error.message : String(error));
    } finally {
      setReadingLocalSession(false);
    }
  }

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
              </div>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                {observedPlayback?.sourceAppId ? (
                  <span className="truncate">
                    Source app: {observedPlayback.sourceAppId}
                  </span>
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
            <LiamPanel connected={connected} hasPlayback={hasObservedTrack} />
            <UpNextPanel />
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
