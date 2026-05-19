import { Activity, Radio, SlidersHorizontal } from 'lucide-react';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WaveformBars } from '@/components/WaveformBars';

interface LiamPanelProps {
  connected: boolean;
  hasPlayback: boolean;
}

export function LiamPanel({
  connected,
  hasPlayback,
}: LiamPanelProps): React.JSX.Element {
  const state = !connected ? 'Idle' : hasPlayback ? 'Listening' : 'Waiting';

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
      </CardContent>
    </Card>
  );
}
