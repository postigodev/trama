/**
 * Trama Desktop App
 * Main entry point
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SpotifyAuthLab } from '@/components/SpotifyAuthLab';

export function App(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6">
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal">Trama</h1>
            <Badge variant="outline">Lab mode</Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Local-first adaptive queue engine for music sessions. This build is focused on making the real Spotify personal-mode path testable.
          </p>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <SpotifyAuthLab />

          <Card>
            <CardHeader>
              <CardTitle>Manual Test Notes</CardTitle>
              <CardDescription>
                Keep the first pass boring: prove the auth loop works before we polish the player.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              <p>1. Create your own Spotify Developer app.</p>
              <p>2. Add the exact redirect URI shown in the lab.</p>
              <p>3. Start auth, approve Spotify, paste the callback URL.</p>
              <p>4. A successful token exchange means the next slice can read playback.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default App;
