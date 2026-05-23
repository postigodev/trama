import { invoke } from '@tauri-apps/api/tauri';
import type { FeedbackEvent, PlayEvent, Session, Track } from '@trama/core';
import {
  createInMemoryRepositories,
  type CreateSessionInput,
  type TramaRepositories,
} from '@trama/db';

interface LocalDbStatus {
  dbPath: string;
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_IPC__' in window;
}

export function createDesktopRepositories(): TramaRepositories {
  if (!isTauriRuntime()) {
    return createInMemoryRepositories();
  }

  return {
    sessions: {
      create(input: CreateSessionInput): Promise<Session> {
        return invoke<Session>('db_session_create', { input });
      },
      findById(sessionId: string): Promise<Session | null> {
        return invoke<Session | null>('db_session_find_by_id', {
          input: { sessionId },
        });
      },
      getActive(): Promise<Session | null> {
        return invoke<Session | null>('db_session_get_active');
      },
      update(session: Session): Promise<Session> {
        return invoke<Session>('db_session_update', { input: { session } });
      },
    },
    tracks: {
      upsert(track: Track): Promise<Track> {
        return invoke<Track>('db_track_upsert', { input: { track } });
      },
      findById(trackId: string): Promise<Track | null> {
        return invoke<Track | null>('db_track_find_by_id', {
          input: { trackId },
        });
      },
      findManyByIds(trackIds: string[]): Promise<Track[]> {
        return invoke<Track[]>('db_track_find_many_by_ids', {
          input: { trackIds },
        });
      },
    },
    events: {
      appendPlayEvent(event: PlayEvent): Promise<PlayEvent> {
        return invoke<PlayEvent>('db_event_append_play_event', {
          input: { event },
        });
      },
      appendFeedbackEvent(event: FeedbackEvent): Promise<FeedbackEvent> {
        return invoke<FeedbackEvent>('db_event_append_feedback_event', {
          input: { event },
        });
      },
      listPlayEventsForSession(sessionId: string): Promise<PlayEvent[]> {
        return invoke<PlayEvent[]>('db_event_list_play_events_for_session', {
          input: { sessionId },
        });
      },
      listFeedbackEventsForSession(sessionId: string): Promise<FeedbackEvent[]> {
        return invoke<FeedbackEvent[]>(
          'db_event_list_feedback_events_for_session',
          {
            input: { sessionId },
          }
        );
      },
    },
  };
}

export async function getLocalDbStatus(): Promise<LocalDbStatus | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<LocalDbStatus>('local_db_status');
}
