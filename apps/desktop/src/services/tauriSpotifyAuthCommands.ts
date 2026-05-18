import { invoke } from '@tauri-apps/api/tauri';

export interface TauriSpotifyAuthStartInput {
  authorizeUrl: string;
  codeVerifier: string;
  state: string;
  scopes: string[];
  startedAt: string;
}

export interface TauriSpotifyAuthStartResult {
  authorizeUrl: string;
  state: string;
  scopes: string[];
  startedAt: string;
  tokenCachePath: string;
}

export interface TauriSpotifyAuthFinishResult {
  code: string;
  codeVerifier: string;
  state: string;
}

export interface TauriSpotifyAuthStatus {
  pending: boolean;
  state: string | null;
  scopes: string[];
  startedAt: string | null;
  tokenCachePath: string;
}

export interface TauriSpotifyCachedToken {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  refreshToken?: string;
  scope?: string;
  savedAt: string;
}

export interface TauriSpotifyTokenSaveInput {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  refreshToken?: string;
  scope?: string;
  savedAt: string;
}

export interface TauriSpotifyTokenStatus {
  authenticated: boolean;
  expiresAt: string | null;
  hasRefreshToken: boolean;
  scope: string | null;
  tokenCachePath: string;
}

export function startSpotifyAuthInTauri(
  input: TauriSpotifyAuthStartInput
): Promise<TauriSpotifyAuthStartResult> {
  return invoke<TauriSpotifyAuthStartResult>('spotify_auth_start', { input });
}

export function finishSpotifyAuthInTauri(
  codeOrCallbackUrl: string
): Promise<TauriSpotifyAuthFinishResult> {
  return invoke<TauriSpotifyAuthFinishResult>('spotify_auth_finish', {
    input: { codeOrCallbackUrl },
  });
}

export function cancelSpotifyAuthInTauri(): Promise<void> {
  return invoke<void>('spotify_auth_cancel');
}

export function getSpotifyAuthStatusFromTauri(): Promise<TauriSpotifyAuthStatus> {
  return invoke<TauriSpotifyAuthStatus>('spotify_auth_status');
}

export function saveSpotifyTokenInTauri(
  input: TauriSpotifyTokenSaveInput
): Promise<TauriSpotifyTokenStatus> {
  return invoke<TauriSpotifyTokenStatus>('spotify_token_save', { input });
}

export function loadSpotifyTokenFromTauri(): Promise<TauriSpotifyCachedToken | null> {
  return invoke<TauriSpotifyCachedToken | null>('spotify_token_load');
}

export function getSpotifyTokenStatusFromTauri(): Promise<TauriSpotifyTokenStatus> {
  return invoke<TauriSpotifyTokenStatus>('spotify_token_status');
}

export function clearSpotifyTokenInTauri(): Promise<TauriSpotifyTokenStatus> {
  return invoke<TauriSpotifyTokenStatus>('spotify_token_clear');
}
