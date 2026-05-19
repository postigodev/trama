import { cn } from '@/lib/utils';
import type React from 'react';

interface WaveformBarsProps {
  active?: boolean;
  compact?: boolean;
  className?: string;
}

const waveformHeights = [
  18, 34, 28, 46, 24, 38, 52, 30, 42, 22, 36, 50, 26, 44, 32, 56, 34, 24, 48,
  40, 28, 54, 36, 20, 46, 30, 52, 24, 42, 34, 58, 28, 44, 36, 22, 50, 30, 40,
  54, 26,
];

export function WaveformBars({
  active = false,
  compact = false,
  className,
}: WaveformBarsProps): React.JSX.Element {
  const bars = compact ? waveformHeights.slice(0, 26) : waveformHeights;

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-24 items-center gap-1 rounded-lg border bg-muted/30 px-4',
        compact && 'h-14 gap-0.5 px-3',
        className
      )}
    >
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={cn(
            'w-1 rounded-full bg-muted-foreground/60',
            compact && 'w-0.5',
            active && 'bg-primary'
          )}
          style={{ height: `${compact ? Math.max(10, height * 0.55) : height}px` }}
        />
      ))}
    </div>
  );
}
