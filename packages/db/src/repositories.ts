/**
 * Repository interfaces for data access
 */

export interface SessionRepository {
  create: (sessionId: string) => Promise<void>;
  find: (sessionId: string) => Promise<any>;
}

export interface EventRepository {
  insert: (event: any) => Promise<void>;
  findBySession: (sessionId: string) => Promise<any[]>;
}
