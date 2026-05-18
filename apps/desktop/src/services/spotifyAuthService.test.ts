import { describe, expect, it } from 'vitest';
import {
  createSpotifyAuthService,
  InMemorySpotifyAuthSessionStore,
} from './spotifyAuthService';

const config = {
  clientId: 'spotify-client-id',
  redirectUri: 'http://127.0.0.1:5173/auth/spotify/callback',
  scopes: ['user-read-playback-state'],
};

describe('@trama/desktop - Spotify auth service', () => {
  it('starts auth and stores the pending PKCE session', async () => {
    const store = new InMemorySpotifyAuthSessionStore();
    const service = createSpotifyAuthService({
      config,
      sessionStore: store,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const started = await service.startAuth();
    const pending = await store.load();
    const url = new URL(started.authorizeUrl);

    expect(started.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(started.scopes).toEqual(['user-read-playback-state']);
    expect(url.searchParams.get('client_id')).toBe('spotify-client-id');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.has('client_secret')).toBe(false);
    expect(pending?.state).toBe(started.state);
    expect(pending?.codeVerifier).toBeTruthy();
  });

  it('finishes auth with the stored verifier and clears pending state', async () => {
    const store = new InMemorySpotifyAuthSessionStore();
    const calls: URLSearchParams[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      calls.push(init?.body as URLSearchParams);
      return new Response(
        JSON.stringify({
          access_token: 'access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'refresh-token',
        }),
        { status: 200 }
      );
    };
    const service = createSpotifyAuthService({
      config,
      sessionStore: store,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const started = await service.startAuth();
    const result = await service.finishAuth(
      `${config.redirectUri}?code=callback-code&state=${started.state}`,
      { fetch: fetchImpl }
    );

    expect(result.token.accessToken).toBe('access-token');
    expect(calls).toHaveLength(1);
    expect(calls[0].get('code')).toBe('callback-code');
    expect(calls[0].get('code_verifier')).toBeTruthy();
    expect(calls[0].has('client_secret')).toBe(false);
    expect(await store.load()).toBeNull();
  });

  it('rejects callback state mismatch before exchanging tokens', async () => {
    const store = new InMemorySpotifyAuthSessionStore();
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return new Response('{}', { status: 200 });
    };
    const service = createSpotifyAuthService({ config, sessionStore: store });
    const started = await service.startAuth();

    await expect(
      service.finishAuth(
        `${config.redirectUri}?code=callback-code&state=wrong-${started.state}`,
        { fetch: fetchImpl }
      )
    ).rejects.toThrow('Spotify callback state did not match');
    expect(called).toBe(false);
  });

  it('requires auth to be started before finishing', async () => {
    const service = createSpotifyAuthService({ config });

    await expect(service.finishAuth('callback-code')).rejects.toThrow(
      'Spotify auth has not been started'
    );
  });

  it('cancels pending auth state', async () => {
    const store = new InMemorySpotifyAuthSessionStore();
    const service = createSpotifyAuthService({ config, sessionStore: store });

    await service.startAuth();
    await service.cancelAuth();

    expect(await store.load()).toBeNull();
  });

  it('reports config status', () => {
    const service = createSpotifyAuthService({ config });
    const missing = createSpotifyAuthService({
      config: { clientId: '', redirectUri: '' },
    });

    expect(service.getStatusSummary()).toBe('Spotify OAuth settings are present');
    expect(missing.getStatusSummary()).toBe('Spotify OAuth is not configured yet');
  });
});
