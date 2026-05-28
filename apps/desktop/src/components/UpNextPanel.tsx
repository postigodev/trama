import { ListMusic, Loader2, Plus, RefreshCcw } from 'lucide-react';
import type React from 'react';
import type { RankedCandidate } from '@trama/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface UpNextPanelProps {
  rankedCandidates: RankedCandidate[];
  queuedTrackUris?: string[];
  busy?: boolean;
  queueBusy?: boolean;
  statusMessage?: string | null;
  onRefresh?: () => void | Promise<void>;
  onQueueTopCandidate?: () => void | Promise<void>;
  onQueueCandidate?: (candidate: RankedCandidate) => void | Promise<void>;
  sourceSummary?: {
    recentlyPlayedCount: number;
    playlistCount: number;
    playlistTrackCount: number;
  } | null;
}

export function UpNextPanel({
  rankedCandidates,
  queuedTrackUris = [],
  busy = false,
  queueBusy = false,
  statusMessage,
  onRefresh,
  onQueueTopCandidate,
  onQueueCandidate,
  sourceSummary,
}: UpNextPanelProps): React.JSX.Element {
  const topCandidate = rankedCandidates[0];
  const topCandidateQueued = topCandidate
    ? queuedTrackUris.includes(topCandidate.track.providerIds.spotify ?? '')
    : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListMusic data-icon="inline-start" />
          Up Next
        </CardTitle>
        <CardDescription>
          Real Spotify candidate pool from recently played and playlists.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onRefresh?.()}
            disabled={!onRefresh || busy || queueBusy}
          >
            {busy ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <RefreshCcw data-icon="inline-start" />
            )}
            Build candidate pool
          </Button>

          <Button
            size="sm"
            onClick={() => void onQueueTopCandidate?.()}
            disabled={
              !onQueueTopCandidate ||
              queueBusy ||
              busy ||
              rankedCandidates.length === 0 ||
              topCandidateQueued
            }
          >
            {queueBusy ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            {topCandidateQueued ? 'Already queued' : 'Queue top pick'}
          </Button>
        </div>

        {sourceSummary ? (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{sourceSummary.recentlyPlayedCount} recent</Badge>
            <Badge variant="outline">{sourceSummary.playlistCount} playlists</Badge>
            <Badge variant="outline">{sourceSummary.playlistTrackCount} playlist tracks</Badge>
          </div>
        ) : null}

        {statusMessage ? (
          <p className="text-xs text-muted-foreground">{statusMessage}</p>
        ) : null}

        {rankedCandidates.length === 0 ? (
          <div className="flex flex-col gap-3">
            {['Current session seed', 'Candidate pool', 'Liam pick', 'Queue action'].map(
              (label, index) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-5 text-xs tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Separator className="flex-1" />
                  <Badge variant="outline">{label}</Badge>
                </div>
              )
            )}
          </div>
        ) : (
          rankedCandidates.slice(0, 6).map(candidate => (
            <div key={candidate.track.id} className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {String(candidate.rank).padStart(2, '0')} {candidate.track.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {candidate.track.artists.map(artist => artist.name).join(', ')}
                      </p>
                    </div>
                    <Badge variant="secondary">{candidate.score.toFixed(3)}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {queuedTrackUris.includes(candidate.track.providerIds.spotify ?? '') ? (
                  <Badge variant="secondary">already queued</Badge>
                ) : null}
                {candidate.reasons.slice(0, 2).map(reason => (
                  <Badge key={reason.id} variant="outline">
                    {reason.type.replace(/_/g, ' ')}
                  </Badge>
                ))}
                {candidate.warnings.slice(0, 1).map(warning => (
                  <Badge key={warning.id} variant="outline">
                    {warning.type.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    !onQueueCandidate ||
                    queueBusy ||
                    busy ||
                    queuedTrackUris.includes(candidate.track.providerIds.spotify ?? '')
                  }
                  onClick={() => void onQueueCandidate?.(candidate)}
                >
                  <Plus data-icon="inline-start" />
                  {queuedTrackUris.includes(candidate.track.providerIds.spotify ?? '')
                    ? 'Queued'
                    : 'Queue'}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
