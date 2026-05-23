import { Activity, Flame, Radio, SlidersHorizontal, ThumbsDown, ThumbsUp } from 'lucide-react';
import type React from 'react';
import type { FeedbackType, Session } from '@trama/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WaveformBars } from '@/components/WaveformBars';

interface LiamPanelProps {
  connected: boolean;
  hasPlayback: boolean;
  session: Session | null;
  currentTrackTitle: string;
  canFeedback: boolean;
  busy?: boolean;
  statusMessage?: string | null;
  onFeedback: (type: FeedbackType) => void | Promise<void>;
  onToggleAutopilot: () => void | Promise<void>;
}

export function LiamPanel({
  connected,
  hasPlayback,
  session,
  currentTrackTitle,
  canFeedback,
  busy = false,
  statusMessage,
  onFeedback,
  onToggleAutopilot,
}: LiamPanelProps): React.JSX.Element {
  const state = !connected ? 'Idle' : hasPlayback ? 'Listening' : 'Waiting';
  const controls = session?.controls;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio data-icon="inline-start" />
          Liam
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <WaveformBars active={hasPlayback} compact />

        <div className="flex flex-wrap gap-2">
          <Badge variant={state === 'Listening' ? 'default' : 'outline'}>
            {state}
          </Badge>
          <Badge variant="secondary">DJ layer</Badge>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity data-icon="inline-start" />
            <span>Session observation first.</span>
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal data-icon="inline-start" />
            <span>Transition scoring comes after playback events.</span>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Feedback
            </span>
            <Badge variant={controls?.autopilotEnabled ? 'secondary' : 'outline'}>
              {controls?.autopilotEnabled ? 'Autopilot on' : 'Autopilot off'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canFeedback || busy}
              onClick={() => void onFeedback('fire')}
            >
              <Flame data-icon="inline-start" />
              Fire
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canFeedback || busy}
              onClick={() => void onFeedback('more_like_this')}
            >
              <ThumbsUp data-icon="inline-start" />
              More like this
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canFeedback || busy}
              onClick={() => void onFeedback('less_like_this')}
            >
              <ThumbsDown data-icon="inline-start" />
              Less like this
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canFeedback || busy}
              onClick={() => void onFeedback('broke_the_mood')}
            >
              <Activity data-icon="inline-start" />
              Broke the mood
            </Button>
          </div>

          <Button
            variant={controls?.autopilotEnabled ? 'secondary' : 'outline'}
            size="sm"
            disabled={busy}
            onClick={() => void onToggleAutopilot()}
          >
            {controls?.autopilotEnabled ? 'Disable autopilot' : 'Enable autopilot'}
          </Button>
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground">
          <span className="truncate">Current track: {currentTrackTitle}</span>
          {controls ? (
            <span>
              Mood {formatControl(controls.moodStrictness)} · Explore{' '}
              {formatControl(controls.exploration)} · Repeat{' '}
              {formatControl(controls.repeatTolerance)} · Mainstream{' '}
              {formatControl(controls.mainstreamTolerance)}
            </span>
          ) : null}
          {statusMessage ? <span>{statusMessage}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function formatControl(value: number): string {
  return `${Math.round(value * 100)}%`;
}
