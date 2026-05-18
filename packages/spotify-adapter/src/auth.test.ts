import { describe, expect, it } from 'vitest';
import {
  createCodeChallenge,
  exchangeCode,
  extractAuthorizationCode,
  generateAuthorizationUrl,
  statusSummary,
} from './auth';

const config = {
  clientId: 'spotify-client-id',
  redirectUri: 'http://127.0.0.1:5173/auth/spotify/callback',
};

describe('@trama/spotify-adapter - PKCE auth helpers', () => {
  it('generates the expected S256 PKCE challenge', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await createCodeChallenge(verifier);

    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('builds a Spotify authorization URL without a client secret', () => {
    const url = new URL(
      generateAuthorizationUrl({
        ...config,
        codeChallenge: 'challenge',
        state: 'state-123',
        scopes: ['user-read-currently-playing', 'user-read-playback-state'],
      })
    );

    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('spotify-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe('challenge');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('scope')).toBe(
      'user-read-currently-playing user-read-playback-state'
    );
    expect(url.searchParams.has('client_secret')).toBe(false);
  });

  it('extracts a code from either a raw code or callback URL', () => {
    expect(extractAuthorizationCode('raw-code')).toBe('raw-code');
    expect(
      extractAuthorizationCode(
        'http://127.0.0.1:5173/auth/spotify/callback?code=callback-code&state=state'
      )
    ).toBe('callback-code');
  });

  it('throws when the callback contains an auth error', () => {
    expect(() =>
      extractAuthorizationCode(
        'http://127.0.0.1:5173/auth/spotify/callback?error=access_denied'
      )
    ).toThrow('Spotify authorization failed: access_denied');
  });

  it('exchanges a code using the PKCE token request body', async () => {
    const calls: Array<{ url: string; body: URLSearchParams }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      calls.push({
        url: url.toString(),
        body: init?.body as URLSearchParams,
      });

      return new Response(
        JSON.stringify({
          access_token: 'access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'refresh-token',
          scope: 'user-read-playback-state',
        }),
        { status: 200 }
      );
    };

    const token = await exchangeCode('callback-code', config, 'verifier', {
      fetch: fetchImpl,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://accounts.spotify.com/api/token');
    expect(calls[0].body.get('grant_type')).toBe('authorization_code');
    expect(calls[0].body.get('code')).toBe('callback-code');
    expect(calls[0].body.get('redirect_uri')).toBe(config.redirectUri);
    expect(calls[0].body.get('client_id')).toBe('spotify-client-id');
    expect(calls[0].body.get('code_verifier')).toBe('verifier');
    expect(calls[0].body.has('client_secret')).toBe(false);
    expect(token).toEqual({
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken: 'refresh-token',
      scope: 'user-read-playback-state',
    });
  });

  it('summarizes missing and present config', () => {
    expect(statusSummary({ clientId: '', redirectUri: '' })).toBe(
      'Spotify OAuth is not configured yet'
    );
    expect(statusSummary(config)).toBe('Spotify OAuth settings are present');
  });
});
