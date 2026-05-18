import {
  exchangeCode,
  extractAuthorizationCode,
  prepareAuthorizationRequest,
  statusSummary,
  type SpotifyAuthConfig,
  type SpotifyAuthorizationRequest,
  type SpotifyTokenResponse,
  type TokenExchangeOptions,
} from '@trama/spotify-adapter';

export interface SpotifyAuthSessionStore {
  save(session: SpotifyPendingAuthSession): Promise<void>;
  load(): Promise<SpotifyPendingAuthSession | null>;
  clear(): Promise<void>;
}

export interface SpotifyPendingAuthSession {
  codeVerifier: string;
  state: string;
  startedAt: string;
  authorizeUrl: string;
  scopes: string[];
}

export interface SpotifyAuthStartResult {
  authorizeUrl: string;
  state: string;
  scopes: string[];
  startedAt: string;
}

export interface SpotifyAuthFinishResult {
  token: SpotifyTokenResponse;
}

export class InMemorySpotifyAuthSessionStore implements SpotifyAuthSessionStore {
  private session: SpotifyPendingAuthSession | null = null;

  async save(session: SpotifyPendingAuthSession): Promise<void> {
    this.session = { ...session, scopes: [...session.scopes] };
  }

  async load(): Promise<SpotifyPendingAuthSession | null> {
    return this.session
      ? { ...this.session, scopes: [...this.session.scopes] }
      : null;
  }

  async clear(): Promise<void> {
    this.session = null;
  }
}

export interface SpotifyAuthServiceOptions {
  config: SpotifyAuthConfig;
  sessionStore?: SpotifyAuthSessionStore;
  now?: () => Date;
}

export class SpotifyAuthService {
  private readonly sessionStore: SpotifyAuthSessionStore;
  private readonly now: () => Date;

  constructor(private readonly options: SpotifyAuthServiceOptions) {
    this.sessionStore =
      options.sessionStore ?? new InMemorySpotifyAuthSessionStore();
    this.now = options.now ?? (() => new Date());
  }

  getStatusSummary(): string {
    return statusSummary(this.options.config);
  }

  async startAuth(): Promise<SpotifyAuthStartResult> {
    const request = await prepareAuthorizationRequest(this.options.config);
    const startedAt = this.now().toISOString();

    await this.sessionStore.save(toPendingAuthSession(request, startedAt));

    return {
      authorizeUrl: request.authorizeUrl,
      state: request.state,
      scopes: request.scopes,
      startedAt,
    };
  }

  async finishAuth(
    codeOrCallbackUrl: string,
    tokenOptions: TokenExchangeOptions = {}
  ): Promise<SpotifyAuthFinishResult> {
    const pending = await this.sessionStore.load();
    if (!pending) {
      throw new Error('Spotify auth has not been started');
    }

    assertCallbackStateMatches(codeOrCallbackUrl, pending.state);

    const token = await exchangeCode(
      codeOrCallbackUrl,
      this.options.config,
      pending.codeVerifier,
      tokenOptions
    );

    await this.sessionStore.clear();

    return { token };
  }

  async cancelAuth(): Promise<void> {
    await this.sessionStore.clear();
  }
}

export function createSpotifyAuthService(
  options: SpotifyAuthServiceOptions
): SpotifyAuthService {
  return new SpotifyAuthService(options);
}

function toPendingAuthSession(
  request: SpotifyAuthorizationRequest,
  startedAt: string
): SpotifyPendingAuthSession {
  return {
    codeVerifier: request.codeVerifier,
    state: request.state,
    startedAt,
    authorizeUrl: request.authorizeUrl,
    scopes: request.scopes,
  };
}

function assertCallbackStateMatches(
  codeOrCallbackUrl: string,
  expectedState: string
): void {
  if (!codeOrCallbackUrl.includes('://')) {
    return;
  }

  const parsed = new URL(codeOrCallbackUrl);
  const callbackState = parsed.searchParams.get('state');

  if (!callbackState) {
    throw new Error('Spotify callback URL did not include a state');
  }

  if (callbackState !== expectedState) {
    throw new Error('Spotify callback state did not match the pending auth session');
  }

  extractAuthorizationCode(codeOrCallbackUrl);
}
