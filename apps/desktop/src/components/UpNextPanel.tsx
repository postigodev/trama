import { ListMusic } from 'lucide-react';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const placeholders = ['Current session seed', 'Candidate pool', 'Liam pick', 'Queue action'];

export function UpNextPanel(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListMusic data-icon="inline-start" />
          Up Next
        </CardTitle>
        <CardDescription>
          Reserved for ranked candidates once playback events are flowing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {placeholders.map((label, index) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-5 text-xs tabular-nums text-muted-foreground">
              {String(index + 1).padStart(2, '0')}
            </span>
            <Separator className="flex-1" />
            <Badge variant="outline">{label}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
