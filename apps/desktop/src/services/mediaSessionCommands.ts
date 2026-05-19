import { invoke } from '@tauri-apps/api/tauri';

export interface ObservedPlayback {
  source: 'windows_media_session' | 'macos_now_playing' | 'linux_mpris';
  sourceAppId?: string;
  title?: string;
  artist?: string;
  albumTitle?: string;
  playbackStatus?: 'playing' | 'paused' | 'stopped' | 'closed' | 'unknown';
  positionMs?: number;
  durationMs?: number;
  observedAtMs: number;
}

export function getCurrentMediaSession(): Promise<ObservedPlayback | null> {
  return invoke<ObservedPlayback | null>('media_session_get_current');
}
