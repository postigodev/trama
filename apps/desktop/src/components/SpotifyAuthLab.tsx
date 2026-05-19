import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { open } from '@tauri-apps/api/shell';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Music2,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  createSpotifyClient,
  exchangeCode,
  mapSpotifyPlaybackToPlaybackState,
  prepareAuthorizationRequest,
  refreshAccessToken,
  statusSummary,
  type SpotifyAuthConfig,
  type SpotifyTokenResponse,
  type PlaybackState,
} from '@trama/spotify-adapter';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  cancelSpotifyAuthInTauri,
  clearSpotifyTokenInTauri,
  finishSpotifyAuthInTauri,
  getSpotifyAuthStatusFromTauri,
  getSpotifyTokenStatusFromTauri,
  loadSpotifyTokenFromTauri,
  saveSpotifyTokenInTauri,
  startSpotifyAuthInTauri,
  type TauriSpotifyCachedToken,
  type TauriSpotifyAuthStatus,
  type TauriSpotifyTokenStatus,
} from '@/services/tauriSpotifyAuthCommands';
import { WaveformBars } from '@/components/WaveformBars';
import { cn } from '@/lib/utils';

interface AuthResultSummary {
  tokenType: string;
  expiresIn: number;
  scope?: string;
  hasRefreshToken: boolean;
}

interface SpotifyAuthLabProps {
  className?: string;
  onConnectionChange?: (connected: boolean) => void;
  onPlaybackChange?: (playback: PlaybackState | null) => void;
}

const defaultRedirectUri =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ??
  'http://127.0.0.1:5173/auth/spotify/callback';

export function SpotifyAuthLab({
  className,
  onConnectionChange,
  onPlaybackChange,
}: SpotifyAuthLabProps): React.JSX.Element {
  const [clientId, setClientId] = useState(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? ''
  );
  const [redirectUri, setRedirectUri] = useState(defaultRedirectUri);
  const [callbackValue, setCallbackValue] = useState('');
  const [authStatus, setAuthStatus] = useState<TauriSpotifyAuthStatus | null>(
    null
  );
  const [tokenStatus, setTokenStatus] = useState<TauriSpotifyTokenStatus | null>(
    null
  );
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AuthResultSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    'status' | 'start' | 'finish' | 'cancel' | 'playback' | 'clearToken' | null
  >(null);

  const config = useMemo<SpotifyAuthConfig>(
    () => ({
      clientId,
      redirectUri,
    }),
    [clientId, redirectUri]
  );

  const configured = clientId.trim().length > 0 && redirectUri.trim().length > 0;

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus(): Promise<void> {
    setBusyAction('status');
    setError(null);
    try {
      setAuthStatus(await getSpotifyAuthStatusFromTauri());
      const nextTokenStatus = await getSpotifyTokenStatusFromTauri();
      setTokenStatus(nextTokenStatus);
      onConnectionChange?.(nextTokenStatus.authenticated);
    } catch (unknownError) {
      setError(toErrorMessage(unknownError));
    } finally {
      setBusyAction(null);
    }
  }

  async function startAuth(): Promise<void> {
    setBusyAction('start');
    setError(null);
    setMessage(null);
    setResult(null);

    try {
      const request = await prepareAuthorizationRequest(config);
      const startedAt = new Date().toISOString();
      const started = await startSpotifyAuthInTauri({
        authorizeUrl: request.authorizeUrl,
        codeVerifier: request.codeVerifier,
        state: request.state,
        scopes: request.scopes,
        startedAt,
      });

      setAuthorizeUrl(started.authorizeUrl);
      setAuthStatus({
        pending: true,
        state: started.state,
        scopes: started.scopes,
        startedAt: started.startedAt,
        tokenCachePath: started.tokenCachePath,
      });
      setMessage('Spotify auth request is ready. Open it, approve, then paste the callback URL here.');
    } catch (unknownError) {
      setError(toErrorMessage(unknownError));
    } finally {
      setBusyAction(null);
    }
  }

  async function openAuthorizeUrl(): Promise<void> {
    if (!authorizeUrl) {
      return;
    }

    try {
      await open(authorizeUrl);
    } catch {
      window.open(authorizeUrl, '_blank', 'noopener,noreferrer');
    }
  }

  async function finishAuth(): Promise<void> {
    setBusyAction('finish');
    setError(null);
    setMessage(null);
    setResult(null);

    try {
      const finished = await finishSpotifyAuthInTauri(callbackValue);
      const token = await exchangeCode(finished.code, config, finished.codeVerifier);
      const savedAt = new Date();
      const expiresAt = new Date(
        savedAt.getTime() + token.expiresIn * 1000
      ).toISOString();
      const savedStatus = await saveSpotifyTokenInTauri({
        accessToken: token.accessToken,
        tokenType: token.tokenType,
        expiresAt,
        refreshToken: token.refreshToken,
        scope: token.scope,
        savedAt: savedAt.toISOString(),
      });

      setResult(toResultSummary(token));
      setTokenStatus(savedStatus);
      setCallbackValue('');
      setAuthorizeUrl(null);
      await refreshStatus();
      setMessage('Spotify auth completed. Token was saved locally and was not displayed.');
    } catch (unknownError) {
      setError(toErrorMessage(unknownError));
    } finally {
      setBusyAction(null);
    }
  }

  async function loadNowPlaying(): Promise<void> {
    setBusyAction('playback');
    setError(null);
    setMessage(null);

    try {
      const token = await loadUsableToken();
      const client = createSpotifyClient(token.accessToken);
      const spotifyPlayback = await client.getCurrentPlayback();
      const normalizedPlayback = mapSpotifyPlaybackToPlaybackState(
        spotifyPlayback,
        new Date().toISOString()
      );

      setPlayback(normalizedPlayback);
      onPlaybackChange?.(normalizedPlayback);
      setMessage(
        normalizedPlayback.track
          ? 'Read current Spotify playback successfully.'
          : 'Spotify is connected, but no active playback was returned.'
      );
    } catch (unknownError) {
      setError(toErrorMessage(unknownError));
    } finally {
      setBusyAction(null);
    }
  }

  async function clearSavedToken(): Promise<void> {
    setBusyAction('clearToken');
    setError(null);
    setMessage(null);

    try {
      setTokenStatus(await clearSpotifyTokenInTauri());
      setPlayback(null);
      onConnectionChange?.(false);
      onPlaybackChange?.(null);
      setResult(null);
      setMessage('Saved Spotify token was cleared from local app data.');
    } catch (unknownError) {
      setError(toErrorMessage(unknownError));
    } finally {
      setBusyAction(null);
    }
  }

  async function loadUsableToken(): Promise<TauriSpotifyCachedToken> {
    const cached = await loadSpotifyTokenFromTauri();
    if (!cached) {
      throw new Error('Spotify is not connected. Authenticate first.');
    }

    if (!isTokenExpired(cached.expiresAt)) {
      return cached;
    }

    if (!cached.refreshToken) {
      throw new Error('Spotify session expired. Re-authenticate Spotify to continue.');
    }

    const refreshed = await refreshAccessToken({
      ...config,
      refreshToken: cached.refreshToken,
    });
    const savedAt = new Date();
    const expiresAt = new Date(
      savedAt.getTime() + refreshed.expiresIn * 1000
    ).toISOString();
    const tokenToSave = {
      accessToken: refreshed.accessToken,
      tokenType: refreshed.tokenType,
      expiresAt,
      refreshToken: refreshed.refreshToken ?? cached.refreshToken,
      scope: refreshed.scope ?? cached.scope,
      savedAt: savedAt.toISOString(),
    };

    setTokenStatus(await saveSpotifyTokenInTauri(tokenToSave));
    return tokenToSave;
  }

  async function cancelAuth(): Promise<void> {
    setBusyAction('cancel');
    setError(null);
    setMessage(null);

    try {
      await cancelSpotifyAuthInTauri();
      setAuthorizeUrl(null);
      setCallbackValue('');
      setResult(null);
      await refreshStatus();
      setMessage('Pending Spotify auth was cleared.');
    } catch (unknownError) {
      setError(toErrorMessage(unknownError));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle>Spotify Auth Lab</CardTitle>
        <CardDescription>
          Connect, persist, refresh, and inspect current playback.
        </CardDescription>
        <CardAction>
          <Badge variant={configured ? 'secondary' : 'outline'}>
            {tokenStatus?.authenticated
              ? 'Connected'
              : configured
                ? 'Configured'
                : 'Needs client ID'}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="spotify-client-id">Client ID</Label>
            <Input
              id="spotify-client-id"
              value={clientId}
              onChange={event => setClientId(event.target.value)}
              placeholder="Your Spotify app client ID"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="spotify-redirect-uri">Redirect URI</Label>
            <Input
              id="spotify-redirect-uri"
              value={redirectUri}
              onChange={event => setRedirectUri(event.target.value)}
              placeholder="http://127.0.0.1:5173/auth/spotify/callback"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Status</span>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={authStatus?.pending ? 'default' : 'outline'}>
              {authStatus?.pending ? 'Pending callback' : 'Idle'}
            </Badge>
            <Badge variant={tokenStatus?.authenticated ? 'secondary' : 'outline'}>
              {tokenStatus?.authenticated ? 'Token saved' : 'No saved token'}
            </Badge>
            <span>{statusSummary(config)}</span>
          </div>
          {tokenStatus?.expiresAt ? (
            <p className="text-xs text-muted-foreground">
              Saved token expires at {formatDateTime(tokenStatus.expiresAt)}.
              Refresh token present: {tokenStatus.hasRefreshToken ? 'yes' : 'no'}.
            </p>
          ) : null}
          {(tokenStatus?.tokenCachePath ?? authStatus?.tokenCachePath) ? (
            <p className="text-xs text-muted-foreground">
              Token cache path: {tokenStatus?.tokenCachePath ?? authStatus?.tokenCachePath}
            </p>
          ) : null}
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button onClick={startAuth} disabled={!configured || busyAction !== null}>
            {busyAction === 'start' ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <ExternalLink data-icon="inline-start" />
            )}
            Start auth
          </Button>

          <Button
            variant="outline"
            onClick={openAuthorizeUrl}
            disabled={!authorizeUrl || busyAction !== null}
          >
            <ExternalLink data-icon="inline-start" />
            Open URL
          </Button>

          <Button
            variant="outline"
            onClick={refreshStatus}
            disabled={busyAction !== null}
          >
            <RotateCcw data-icon="inline-start" />
            Refresh
          </Button>

          <Button
            variant="ghost"
            onClick={cancelAuth}
            disabled={busyAction !== null || !authStatus?.pending}
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={loadNowPlaying}
            disabled={busyAction !== null || !tokenStatus?.authenticated}
          >
            {busyAction === 'playback' ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Music2 data-icon="inline-start" />
            )}
            Now playing
          </Button>

          <Button
            variant="ghost"
            onClick={clearSavedToken}
            disabled={busyAction !== null || !tokenStatus?.authenticated}
          >
            <Trash2 data-icon="inline-start" />
            Clear token
          </Button>
        </div>

        {authorizeUrl ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="spotify-authorize-url">Authorize URL</Label>
            <Textarea
              id="spotify-authorize-url"
              value={authorizeUrl}
              readOnly
              rows={3}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="spotify-callback">Callback URL or code</Label>
          <Textarea
            id="spotify-callback"
            value={callbackValue}
            onChange={event => setCallbackValue(event.target.value)}
            placeholder="Paste the full callback URL, or just the code parameter"
            rows={4}
          />
        </div>

        <div>
          <Button
            onClick={finishAuth}
            disabled={
              !configured ||
              !authStatus?.pending ||
              callbackValue.trim().length === 0 ||
              busyAction !== null
            }
          >
            {busyAction === 'finish' ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <ClipboardCheck data-icon="inline-start" />
            )}
            Finish auth
          </Button>
        </div>

        {message ? (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Ready</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Auth issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Token exchange succeeded</AlertTitle>
            <AlertDescription>
              {result.tokenType} token expires in {result.expiresIn} seconds.
              Refresh token present: {result.hasRefreshToken ? 'yes' : 'no'}.
              {result.scope ? ` Scope: ${result.scope}.` : ''}
            </AlertDescription>
          </Alert>
        ) : null}

        {playback ? (
          <section className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
            <div>
              <h2 className="text-sm font-medium">Now Playing</h2>
              <p className="text-xs text-muted-foreground">
                Observed at {formatDateTime(playback.observedAt)}
              </p>
            </div>
            <WaveformBars active={playback.isPlaying} compact />
            <div className="flex flex-col gap-3">
              {playback.track ? (
                <div className="flex gap-3">
                  {playback.track.artworkUrl ? (
                    <img
                      src={playback.track.artworkUrl}
                      alt=""
                      className="size-16 rounded-md object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {playback.track.title}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {playback.track.artists.map(artist => artist.name).join(', ') ||
                        'Unknown artist'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {playback.isPlaying ? 'Playing' : 'Paused'}
                      {typeof playback.progressMs === 'number' &&
                      playback.durationMs
                        ? ` / ${formatDuration(playback.progressMs)} of ${formatDuration(
                            playback.durationMs
                          )}`
                        : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Spotify returned no active track. Start playback in Spotify and try again.
                </p>
              )}

              {playback.device ? (
                <p className="text-xs text-muted-foreground">
                  Device: {playback.device.name ?? 'Unknown device'}
                  {playback.device.type ? ` (${playback.device.type})` : ''}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function toResultSummary(token: SpotifyTokenResponse): AuthResultSummary {
  return {
    tokenType: token.tokenType,
    expiresIn: token.expiresIn,
    scope: token.scope,
    hasRefreshToken: Boolean(token.refreshToken),
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isTokenExpired(expiresAt: string): boolean {
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) {
    return true;
  }

  return expiry - Date.now() <= 60_000;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
