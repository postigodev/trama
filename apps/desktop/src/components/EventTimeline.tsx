import { Clock3 } from 'lucide-react';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { PlaybackEvent } from '@/services/playbackEvents';

interface EventTimelineProps {
  events: PlaybackEvent[];
}

export function EventTimeline({
  events,
}: EventTimelineProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock3 data-icon="inline-start" />
          Event Timeline
        </CardTitle>
        <CardDescription>
          Inferred from local media session observations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Waiting for local playback changes.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(event => (
              <div key={event.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{event.summary}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {event.sourceLabel}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatEventType(event.type)}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{new Date(event.observedAtMs).toLocaleTimeString()}</span>
                  {typeof event.progressMs === 'number' &&
                  typeof event.durationMs === 'number' ? (
                    <span>
                      {formatDuration(event.progressMs)} /{' '}
                      {formatDuration(event.durationMs)}
                    </span>
                  ) : null}
                  <span>{Math.round(event.confidence * 100)}% confidence</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatEventType(type: PlaybackEvent['type']): string {
  return type.replace(/_/g, ' ');
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
