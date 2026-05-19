# Data Model

This document defines Trama’s initial data model.

The data model should support:

```txt
local-first persistence
session-aware ranking
provider-independent core types
Spotify integration through adapter mapping
demo mode
recommendation explanations
future lightweight learning
````

The most important modeling rule is:

```txt
provider data -> adapter mapping -> Trama models -> core engine
```

Provider-specific response objects should not become core models.

---

## Modeling principles

### 1. Normalize provider data

External APIs should be mapped into Trama-owned types.

Bad:

```ts
type Track = SpotifyApi.TrackObjectFull;
```

Good:

```ts
type Track = {
  id: string;
  providerIds: ProviderIds;
  title: string;
  artists: Artist[];
  durationMs: number;
};
```

---

### 2. Treat sessions as first-class objects

The session is not just a timestamp range.

It is the central context for ranking.

A session contains:

```txt
current track
recent events
accepted directions
rejected directions
feedback
controls
ranking state
```

---

### 3. Store events, not only state

Trama should persist listening behavior as an event log.

State can be derived from events.

Events make the system:

```txt
debuggable
auditable
testable
explainable
replayable
```

---

### 4. Keep ranking output inspectable

Recommendation results should include score breakdowns and reasons.

Do not store only:

```txt
track_id + score
```

Store enough information to explain why that score existed at that moment.

---

### 5. Separate long-term cache from session state

Track, artist, album, and playlist metadata may be cached locally.

But a listening session should remain its own object.

Avoid mixing:

```txt
library metadata
session behavior
provider token state
UI settings
```

---

## Core entities

Initial core entities:

```txt
Provider
Track
Artist
Album
Playlist
Session
PlayEvent
FeedbackEvent
Candidate
RankedCandidate
RecommendationExplanation
QueueAction
UserSettings
ProviderConnection
```

---

# Provider identity

Trama may support multiple providers over time.

Provider IDs should be explicit.

```ts
type ProviderName =
  | "spotify"
  | "demo"
  | "local"
  | "listenbrainz"
  | "lastfm"
  | "apple_music"
  | "youtube_music";
```

A track can have IDs from multiple providers:

```ts
type ProviderIds = Partial<Record<ProviderName, string>>;
```

Example:

```json
{
  "spotify": "spotify:track:123",
  "demo": "demo:track:late-night-001"
}
```

---

# Track

A track is the basic item being ranked.

```ts
type Track = {
  id: string;
  providerIds: ProviderIds;

  title: string;
  artists: ArtistSummary[];
  album?: AlbumSummary;

  durationMs: number;
  popularity?: number;

  explicit?: boolean;
  artworkUrl?: string;

  tags?: string[];
  source?: TrackSource;

  createdAt: string;
  updatedAt: string;
};
```

Notes:

```txt
id is Trama's internal ID
providerIds store external provider identifiers
popularity is optional and provider-dependent
tags are optional and may come from demo data or future adapters
```

Avoid requiring audio features in the core model.

---

## TrackSource

```ts
type TrackSource =
  | "provider_current_playback"
  | "provider_recently_played"
  | "provider_playlist"
  | "provider_search"
  | "provider_artist_top_tracks"
  | "demo_fixture"
  | "manual_import"
  | "local_cache";
```

This helps explain where candidates came from.

---

# Artist

```ts
type Artist = {
  id: string;
  providerIds: ProviderIds;

  name: string;
  artworkUrl?: string;
  popularity?: number;
  tags?: string[];

  createdAt: string;
  updatedAt: string;
};
```

A lightweight artist summary can be embedded in tracks.

```ts
type ArtistSummary = {
  id: string;
  name: string;
  providerIds?: ProviderIds;
};
```

---

# Album

```ts
type Album = {
  id: string;
  providerIds: ProviderIds;

  title: string;
  artists: ArtistSummary[];
  artworkUrl?: string;
  releaseDate?: string;

  createdAt: string;
  updatedAt: string;
};
```

Album summary:

```ts
type AlbumSummary = {
  id: string;
  title: string;
  artworkUrl?: string;
  providerIds?: ProviderIds;
};
```

---

# Playlist

Playlists are useful for candidate generation and relation modeling.

```ts
type Playlist = {
  id: string;
  providerIds: ProviderIds;

  name: string;
  ownerName?: string;
  description?: string;
  artworkUrl?: string;

  source: PlaylistSource;

  createdAt: string;
  updatedAt: string;
};
```

```ts
type PlaylistSource =
  | "user_owned"
  | "user_followed"
  | "provider_import"
  | "demo_fixture"
  | "manual_import";
```

Playlist items should be stored separately.

```ts
type PlaylistTrack = {
  playlistId: string;
  trackId: string;
  position?: number;
  addedAt?: string;
};
```

This allows playlist co-occurrence and adjacency features.

---

# Session

A session is the main ranking context.

```ts
type Session = {
  id: string;

  status: SessionStatus;
  mode: SessionMode;

  seedTrackId?: string;
  currentTrackId?: string;

  startedAt: string;
  updatedAt: string;
  endedAt?: string;

  controls: SessionControls;
  summary?: SessionSummary;
};
```

```ts
type SessionStatus =
  | "active"
  | "paused"
  | "ended"
  | "reset";
```

```ts
type SessionMode =
  | "default"
  | "keep_mood"
  | "explore"
  | "demo"
  | "lab";
```

---

## SessionControls

Session controls affect ranking.

```ts
type SessionControls = {
  moodStrictness: number;       // 0.0 - 1.0
  exploration: number;          // 0.0 - 1.0
  repeatTolerance: number;      // 0.0 - 1.0
  mainstreamTolerance: number;  // 0.0 - 1.0
  autopilotEnabled: boolean;
};
```

Default:

```ts
const defaultSessionControls: SessionControls = {
  moodStrictness: 0.7,
  exploration: 0.25,
  repeatTolerance: 0.25,
  mainstreamTolerance: 0.5,
  autopilotEnabled: false,
};
```

---

## SessionSummary

A session summary is derived from events.

It should be cacheable but not treated as the source of truth.

```ts
type SessionSummary = {
  completedTrackIds: string[];
  skippedTrackIds: string[];
  replayedTrackIds: string[];
  acceptedArtistIds: string[];
  rejectedArtistIds: string[];
  recentTrackIds: string[];

  completionCount: number;
  skipCount: number;
  replayCount: number;
  feedbackCount: number;

  chainHealth?: number;
  lastComputedAt: string;
};
```

---

# PlayEvent

A play event records something that happened during listening.

```ts
type PlayEvent = {
  id: string;
  sessionId: string;

  trackId?: string;
  providerName?: ProviderName;
  providerPlaybackId?: string;

  type: PlayEventType;

  occurredAt: string;

  progressMs?: number;
  durationMs?: number;

  inferred: boolean;
  confidence?: number;

  metadata?: Record<string, unknown>;
};
```

```ts
type PlayEventType =
  | "session_started"
  | "session_paused"
  | "session_resumed"
  | "session_ended"
  | "session_reset"
  | "track_started"
  | "track_completed"
  | "track_skipped"
  | "track_replayed"
  | "track_paused"
  | "track_resumed"
  | "candidate_queued"
  | "candidate_rejected"
  | "autopilot_enabled"
  | "autopilot_disabled";
```

Examples:

```json
{
  "type": "track_skipped",
  "trackId": "trk_123",
  "progressMs": 23000,
  "durationMs": 210000,
  "inferred": true,
  "confidence": 0.92
}
```

---

# FeedbackEvent

Feedback events represent explicit user input.

```ts
type FeedbackEvent = {
  id: string;
  sessionId: string;

  trackId?: string;
  candidateTrackId?: string;

  type: FeedbackType;

  occurredAt: string;

  weight?: number;
  note?: string;

  metadata?: Record<string, unknown>;
};
```

```ts
type FeedbackType =
  | "fire"
  | "more_like_this"
  | "less_like_this"
  | "too_mainstream"
  | "too_safe"
  | "too_different"
  | "broke_the_mood"
  | "keep_mood"
  | "surprise_me";
```

Feedback should affect ranking immediately.

---

# Candidate

A candidate is a possible next track.

Candidate generation is separate from ranking.

```ts
type CandidateTrack = {
  track: Track;

  source: CandidateSource;
  sourceRefs?: CandidateSourceRef[];

  generatedAt: string;

  unavailable?: boolean;
  unavailableReason?: string;
};
```

```ts
type CandidateSource =
  | "playlist_cooccurrence"
  | "playlist_adjacency"
  | "current_artist"
  | "accepted_artist"
  | "recently_played_relation"
  | "library_relation"
  | "provider_search"
  | "demo_pool"
  | "manual_seed";
```

```ts
type CandidateSourceRef = {
  type: "track" | "artist" | "album" | "playlist" | "event" | "feedback";
  id: string;
};
```

---

# RankedCandidate

A ranked candidate is the output of the ranking engine.

```ts
type RankedCandidate = {
  track: Track;

  rank: number;
  score: number;

  scoreBreakdown: ScoreBreakdown;
  reasons: RecommendationReason[];
  warnings: RecommendationWarning[];

  generatedAt: string;
};
```

---

## ScoreBreakdown

```ts
type ScoreBreakdown = {
  total: number;

  components: {
    sessionSimilarity: ScoreComponent;
    artistAffinity: ScoreComponent;
    playlistAffinity: ScoreComponent;
    completionAffinity: ScoreComponent;
    explicitFeedback: ScoreComponent;
    novelty: ScoreComponent;
    mainstream: ScoreComponent;
    skipRisk: ScoreComponent;
    recentRepeatRisk: ScoreComponent;
    moodBreakRisk: ScoreComponent;
  };
};
```

```ts
type ScoreComponent = {
  raw: number;
  weight: number;
  contribution: number;
};
```

---

## RecommendationReason

Reasons should be grounded in score components.

```ts
type RecommendationReason = {
  id: string;
  type: RecommendationReasonType;
  message: string;
  component?: keyof ScoreBreakdown["components"];
  strength: "low" | "medium" | "high";
};
```

```ts
type RecommendationReasonType =
  | "session_match"
  | "artist_affinity"
  | "playlist_relation"
  | "completion_signal"
  | "explicit_feedback"
  | "novelty"
  | "not_recently_played"
  | "safe_transition"
  | "controlled_surprise";
```

Example:

```json
{
  "type": "playlist_relation",
  "message": "Appears in a playlist cluster related to the last completed tracks.",
  "component": "playlistAffinity",
  "strength": "medium"
}
```

---

## RecommendationWarning

Warnings explain tradeoffs.

```ts
type RecommendationWarning = {
  id: string;
  type: RecommendationWarningType;
  message: string;
  component?: keyof ScoreBreakdown["components"];
  severity: "low" | "medium" | "high";
};
```

```ts
type RecommendationWarningType =
  | "recent_repeat"
  | "skip_risk"
  | "mood_break_risk"
  | "high_novelty"
  | "low_session_similarity"
  | "mainstream_risk"
  | "provider_unavailable";
```

---

# QueueAction

A queue action records when Trama suggests or inserts a candidate.

```ts
type QueueAction = {
  id: string;
  sessionId: string;

  trackId: string;
  providerName: ProviderName;

  type: QueueActionType;
  status: QueueActionStatus;

  requestedBy: "user" | "autopilot" | "demo";

  occurredAt: string;

  rankedCandidateSnapshot?: RankedCandidate;
  errorMessage?: string;
};
```

```ts
type QueueActionType =
  | "suggested"
  | "queued"
  | "rejected"
  | "skipped_by_user";
```

```ts
type QueueActionStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled";
```

Queue actions should be stored because they affect debugging and repeat penalties.

---

# ProviderConnection

Provider connections store integration state.

```ts
type ProviderConnection = {
  id: string;

  providerName: ProviderName;
  displayName?: string;

  status: ProviderConnectionStatus;

  createdAt: string;
  updatedAt: string;
  lastConnectedAt?: string;

  metadata?: Record<string, unknown>;
};
```

```ts
type ProviderConnectionStatus =
  | "connected"
  | "disconnected"
  | "expired"
  | "error";
```

Tokens should be handled carefully and may require a separate secure storage mechanism depending on platform.

Avoid logging tokens.

---

# UserSettings

User settings are local.

```ts
type UserSettings = {
  id: string;

  defaultSessionControls: SessionControls;

  demoModeEnabled: boolean;
  labModeEnabled: boolean;

  activeProvider?: ProviderName;

  createdAt: string;
  updatedAt: string;
};
```

---

# SQLite schema draft

This is a draft schema for local persistence.

Exact syntax may change depending on the SQLite library and migration tool.

---

## tracks

```sql
CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  popularity INTEGER,
  explicit INTEGER DEFAULT 0,
  artwork_url TEXT,
  tags_json TEXT,
  provider_ids_json TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## artists

```sql
CREATE TABLE artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  artwork_url TEXT,
  popularity INTEGER,
  tags_json TEXT,
  provider_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## track_artists

```sql
CREATE TABLE track_artists (
  track_id TEXT NOT NULL,
  artist_id TEXT NOT NULL,
  position INTEGER,

  PRIMARY KEY (track_id, artist_id),

  FOREIGN KEY (track_id) REFERENCES tracks(id),
  FOREIGN KEY (artist_id) REFERENCES artists(id)
);
```

---

## albums

```sql
CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artwork_url TEXT,
  release_date TEXT,
  provider_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## track_albums

```sql
CREATE TABLE track_albums (
  track_id TEXT NOT NULL,
  album_id TEXT NOT NULL,

  PRIMARY KEY (track_id, album_id),

  FOREIGN KEY (track_id) REFERENCES tracks(id),
  FOREIGN KEY (album_id) REFERENCES albums(id)
);
```

---

## playlists

```sql
CREATE TABLE playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT,
  description TEXT,
  artwork_url TEXT,
  source TEXT NOT NULL,
  provider_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## playlist_tracks

```sql
CREATE TABLE playlist_tracks (
  playlist_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  position INTEGER,
  added_at TEXT,

  PRIMARY KEY (playlist_id, track_id),

  FOREIGN KEY (playlist_id) REFERENCES playlists(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);
```

---

## sessions

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  mode TEXT NOT NULL,
  seed_track_id TEXT,
  current_track_id TEXT,
  controls_json TEXT NOT NULL,
  summary_json TEXT,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  ended_at TEXT,

  FOREIGN KEY (seed_track_id) REFERENCES tracks(id),
  FOREIGN KEY (current_track_id) REFERENCES tracks(id)
);
```

---

## play_events

```sql
CREATE TABLE play_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  track_id TEXT,
  provider_name TEXT,
  provider_playback_id TEXT,
  type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  progress_ms INTEGER,
  duration_ms INTEGER,
  inferred INTEGER NOT NULL DEFAULT 0,
  confidence REAL,
  metadata_json TEXT,

  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);
```

Indexes:

```sql
CREATE INDEX idx_play_events_session_id
ON play_events(session_id);

CREATE INDEX idx_play_events_track_id
ON play_events(track_id);

CREATE INDEX idx_play_events_type
ON play_events(type);

CREATE INDEX idx_play_events_occurred_at
ON play_events(occurred_at);
```

---

## feedback_events

```sql
CREATE TABLE feedback_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  track_id TEXT,
  candidate_track_id TEXT,
  type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  weight REAL,
  note TEXT,
  metadata_json TEXT,

  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id),
  FOREIGN KEY (candidate_track_id) REFERENCES tracks(id)
);
```

Indexes:

```sql
CREATE INDEX idx_feedback_events_session_id
ON feedback_events(session_id);

CREATE INDEX idx_feedback_events_track_id
ON feedback_events(track_id);

CREATE INDEX idx_feedback_events_type
ON feedback_events(type);
```

---

## queue_actions

```sql
CREATE TABLE queue_actions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  ranked_candidate_snapshot_json TEXT,
  error_message TEXT,

  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);
```

---

## provider_connections

```sql
CREATE TABLE provider_connections (
  id TEXT PRIMARY KEY,
  provider_name TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_connected_at TEXT
);
```

---

## user_settings

```sql
CREATE TABLE user_settings (
  id TEXT PRIMARY KEY,
  default_session_controls_json TEXT NOT NULL,
  demo_mode_enabled INTEGER NOT NULL DEFAULT 1,
  lab_mode_enabled INTEGER NOT NULL DEFAULT 0,
  active_provider TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

# Suggested repository interfaces

The app should use repository interfaces instead of raw database access everywhere.

---

## TrackRepository

```ts
interface TrackRepository {
  upsertTrack(track: Track): Promise<void>;
  getTrackById(id: string): Promise<Track | null>;
  getTracksByIds(ids: string[]): Promise<Track[]>;
  searchLocalTracks(query: string): Promise<Track[]>;
}
```

---

## SessionRepository

```ts
interface SessionRepository {
  createSession(input: CreateSessionInput): Promise<Session>;
  getActiveSession(): Promise<Session | null>;
  updateSession(id: string, patch: Partial<Session>): Promise<Session>;
  endSession(id: string): Promise<void>;
}
```

---

## EventRepository

```ts
interface EventRepository {
  appendPlayEvent(event: PlayEvent): Promise<void>;
  listPlayEventsForSession(sessionId: string): Promise<PlayEvent[]>;

  appendFeedbackEvent(event: FeedbackEvent): Promise<void>;
  listFeedbackForSession(sessionId: string): Promise<FeedbackEvent[]>;
}
```

---

## PlaylistRepository

```ts
interface PlaylistRepository {
  upsertPlaylist(playlist: Playlist): Promise<void>;
  upsertPlaylistTracks(playlistId: string, trackIds: string[]): Promise<void>;
  listPlaylists(): Promise<Playlist[]>;
  listTracksForPlaylist(playlistId: string): Promise<Track[]>;
  findPlaylistsContainingTrack(trackId: string): Promise<Playlist[]>;
}
```

---

## QueueActionRepository

```ts
interface QueueActionRepository {
  recordQueueAction(action: QueueAction): Promise<void>;
  listRecentQueueActions(sessionId: string): Promise<QueueAction[]>;
}
```

---

# Derived data

Some data should be derived from events rather than manually maintained.

Examples:

```txt
session summary
chain health
completed track IDs
skipped track IDs
artist acceptance/rejection
recent repeat risk
feedback summary
```

Derived data can be cached, but it should be possible to recompute it from event history.

---

## Chain health

`chainHealth` is an optional derived metric.

It should not be treated as objective truth.

Possible v0 approximation:

```txt
chainHealth =
  completion ratio
  - early skip ratio
  + replay bonus
  + positive feedback bonus
  - mood break penalty
```

Use it as a UI indicator, not a final ranking metric unless carefully tested.

---

# Demo data

Demo mode should use the same models as provider mode.

Demo fixtures should include:

```txt
tracks
artists
playlists
playlist_tracks
sessions
play_events
feedback_events
candidate_pools
```

Demo scenarios should be structured enough to test the engine.

Example:

```ts
type DemoScenario = {
  id: string;
  name: string;
  description: string;
  seedTrackId: string;
  session: Session;
  events: PlayEvent[];
  feedback: FeedbackEvent[];
  candidatePool: CandidateTrack[];
};
```

Suggested demo scenarios:

```txt
late-night melodic session
gym session
study session
rock en español session
party session
broken session with many skips
high exploration session
keep mood session
```

---

# Provider mapping

Provider adapters should map external data into Trama models.

Example Spotify mapping:

```txt
Spotify track object
  -> Track
Spotify artist object
  -> Artist
Spotify playlist object
  -> Playlist
Spotify currently playing response
  -> PlaybackState
Spotify recently played item
  -> PlayEvent candidate source
```

Mapping should happen in the adapter package.

Do not leak provider response shapes into `packages/core`.

---

# ObservedPlayback

`ObservedPlayback` is the provider-independent shape for local OS media session
observation.

It is intentionally looser than `PlaybackState` because OS media sessions may
not include provider IDs, canonical track IDs, or full album metadata.

```ts
type ObservedPlayback = {
  source: "windows_media_session" | "macos_now_playing" | "linux_mpris";
  sourceAppId?: string;

  title?: string;
  artist?: string;
  albumTitle?: string;

  playbackStatus?: "playing" | "paused" | "stopped" | "closed" | "unknown";

  positionMs?: number;
  durationMs?: number;

  observedAtMs: number;
};
```

`ObservedPlayback` should be used for local-first observation and then enriched
by provider adapters when possible.

Example:

```txt
Windows media session
  -> ObservedPlayback
  -> optional Spotify enrichment
  -> Track / PlaybackState / PlayEvent
```

The absence of provider IDs should not block event inference. It should lower
confidence or trigger enrichment.

---

# PlaybackState

Provider adapters may expose normalized playback state.

```ts
type PlaybackState = {
  providerName: ProviderName;

  isPlaying: boolean;
  track: Track | null;

  progressMs?: number;
  durationMs?: number;

  device?: PlaybackDevice;
  observedAt: string;
};
```

```ts
type PlaybackDevice = {
  id?: string;
  name?: string;
  type?: string;
  isActive?: boolean;
};
```

Playback state is not the same as a play event.

The observer compares playback states over time and infers events.

---

# Event inference

Event inference converts playback changes into play events.

Example:

```txt
previous playback state
+ current playback state
+ active session
= inferred play event(s)
```

Potential inferred events:

```txt
track_started
track_skipped
track_completed
track_paused
track_resumed
track_replayed
```

Inference should include confidence when appropriate.

Initial desktop heuristics:

```txt
track_completed:
  inferred when a track changes after roughly 85% progress
  or with 15 seconds or less remaining

track_skipped:
  inferred when a track changes after at least 10 seconds
  but before roughly 50% progress

track_replayed:
  inferred when a recently observed track appears again
```

These thresholds should remain visible and adjustable as Trama learns from real
sessions. They are session signals, not objective judgments about the music.

Early desktop builds may keep inferred events in memory before writing them to
the database. That is acceptable while the observer is being validated, as long
as the event shape still matches the future persisted model.

---

# Data privacy

Trama should store only what is needed for the local recommendation experience.

Avoid collecting:

```txt
unnecessary personal profile data
precise location
contacts
social data
private analytics
centralized listening history
```

Avoid logging:

```txt
access tokens
refresh tokens
private provider responses
full personal playlist contents unless debugging explicitly requires it
```

---

# Migration principles

Database migrations should be:

```txt
versioned
reviewable
reversible when practical
safe for local user data
documented when destructive
```

Never silently delete user session history without explicit migration notes.

---

# Open questions

The following decisions can be finalized during implementation:

```txt
SQLite library
migration tool
secure token storage strategy
whether score snapshots should be persisted permanently
whether candidate pools should be cached
how much metadata to retain from provider imports
how to deduplicate tracks across providers
how to handle unavailable tracks
```

---

# Guiding sentence

The data model should make the session legible.

If an event changed the recommendation, the data model should be able to show what happened, when it happened, and why it mattered.
