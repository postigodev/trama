# Architecture

This document defines the technical architecture for Trama.

Trama should be built as a modular, local-first system where the recommendation engine is independent from any specific music provider.

The core architectural rule is:

```txt
core engine != provider adapter != UI
````

---

## Goals

Trama’s architecture should support:

```txt
local-first session tracking
transparent recommendation logic
provider-independent ranking
Spotify integration as one adapter
demo mode without external APIs
testable core logic
contributor-friendly development
polished desktop UX
future provider adapters
```

The architecture should avoid:

```txt
provider-specific logic inside the core engine
ranking logic inside UI components
database writes scattered across the app
LLMs in the core loop
unexplained recommendation outputs
hard dependency on Spotify for local development
```

---

## Proposed monorepo structure

```txt
trama/
  apps/
    desktop/
      src/
        app/
        components/
        features/
        hooks/
        routes/
        styles/
        lib/
      src-tauri/
      package.json

  packages/
    core/
      src/
        engine/
        session/
        scoring/
        explanations/
        candidates/
        events/
        types/
      tests/
      package.json

    db/
      src/
        migrations/
        repositories/
        schema/
        seed/
        types/
      package.json

    spotify-adapter/
      src/
        auth/
        client/
        playback/
        playlists/
        queue/
        mapper/
        types/
      tests/
      package.json

    demo-fixtures/
      src/
        tracks/
        artists/
        playlists/
        sessions/
        candidatePools/
        scenarios/
      package.json

    shared/
      src/
        config/
        errors/
        logging/
        utils/
      package.json

  docs/
    project-thesis.md
    product-principles.md
    architecture.md
    ranking-engine.md
    data-model.md
    ui-principles.md
    spotify-integration.md
    roadmap.md

  AGENTS.md
  CONTRIBUTING.md
  README.md
  LICENSE
  package.json
  pnpm-workspace.yaml
  turbo.json
```

This structure assumes a TypeScript-first monorepo with a Tauri desktop app.

The exact tooling can change, but the boundaries should remain.

---

## Package responsibilities

### `apps/desktop`

The desktop app is the user-facing companion interface.

Responsibilities:

```txt
render Now Playing view
render ranked candidate cards
render recommendation explanations
render feedback controls
render session controls
render Lab Mode
render Demo Mode
call local app commands
display provider connection state
display local engine state
```

The desktop app should not own ranking logic.

It may call the core engine, but it should not implement candidate scoring inside React components.

Avoid:

```txt
scoreCandidate() inside a component
Spotify API calls directly inside UI components
database writes directly inside presentational components
provider response objects stored as UI state
```

Prefer:

```txt
UI event
  -> feature hook/service
  -> app command or package call
  -> core/db/adapter boundary
  -> normalized state back to UI
```

---

### `packages/core`

The core package is the heart of Trama.

It should be provider-independent and database-independent.

Responsibilities:

```txt
session state modeling
play event interpretation
candidate scoring
ranking
score breakdowns
recommendation explanations
feedback interpretation
session updates
ranking configuration
engine tests
```

The core package should only depend on normalized Trama types.

It should not know about:

```txt
Spotify access tokens
Spotify API response shapes
Tauri APIs
SQLite drivers
React state
OAuth flows
network requests
```

Preferred core input:

```ts
type QueueEngineInput = {
  currentTrack: Track;
  session: SessionState;
  candidates: CandidateTrack[];
  feedback: FeedbackEvent[];
  config: RankingConfig;
};
```

Preferred core output:

```ts
type QueueEngineOutput = {
  rankedCandidates: RankedCandidate[];
  updatedSession?: SessionState;
  diagnostics?: EngineDiagnostics;
};
```

---

### `packages/db`

The database package manages local persistence.

Responsibilities:

```txt
SQLite schema
migrations
repositories
local event log
session persistence
track cache
artist cache
playlist cache
feedback persistence
provider token persistence if needed
demo seed data
```

The database package should expose repository-style methods rather than leaking raw database access everywhere.

Example:

```ts
interface SessionRepository {
  createSession(input: CreateSessionInput): Promise<SessionRecord>;
  getActiveSession(): Promise<SessionRecord | null>;
  appendPlayEvent(event: PlayEventRecord): Promise<void>;
  listRecentEvents(sessionId: string): Promise<PlayEventRecord[]>;
}
```

Avoid direct SQL inside UI components or provider adapters unless isolated behind a repository.

---

### `packages/spotify-adapter`

The Spotify adapter connects Trama to Spotify.

Responsibilities:

```txt
OAuth PKCE flow
token refresh
Spotify Web API client
current playback polling
recently played import
playlist import
queue insertion
device awareness
mapping Spotify objects to Trama models
handling Spotify-specific errors
```

The adapter should translate Spotify data into normalized Trama types.

Example boundary:

```txt
Spotify Track Object
  -> spotify-adapter mapper
  -> Trama Track
  -> core engine
```

The core engine should never receive raw Spotify response objects.

The adapter should not decide ranking logic.

---

### `packages/demo-fixtures`

Demo fixtures make Trama usable without external APIs.

Responsibilities:

```txt
mock tracks
mock artists
mock playlists
mock sessions
mock candidate pools
mock play events
mock feedback events
scenario definitions
demo playback simulation
```

Demo mode should support realistic examples such as:

```txt
late-night melodic session
gym session
study session
rock en español session
party session
high-skip broken session
```

Fixtures should be rich enough to test ranking explanations and UI states.

---

### `packages/shared`

Shared utilities should remain small.

Responsibilities:

```txt
common error types
logging helpers
config parsing
generic utility functions
shared constants
```

Do not turn `shared` into a dumping ground.

If logic belongs to the ranking engine, put it in `core`.

If logic belongs to Spotify, put it in `spotify-adapter`.

If logic belongs to persistence, put it in `db`.

---

## Observation and Control Split

Trama should separate observation from provider control.

Preferred real-provider architecture:

```txt
local OS media session observer
        ↓
normalized ObservedPlayback
        ↓
local event inference
        ↓
event timeline / local event log
        ↓
core session/ranking engine
        ↓
Liam control action
        ↓
Spotify Web API control/enrichment
```

Observation should be local-first when the OS exposes a reliable media session
API. On Windows, this means using system media session APIs before falling back
to Spotify polling. Spotify Web API should remain responsible for
provider-specific control and enrichment:

```txt
OS media session:
  observe active media source
  detect title/artist/playback state/timeline
  avoid provider rate limits for basic observation

Spotify Web API:
  authenticate
  refresh tokens
  queue tracks
  pause/resume/skip when controlling Spotify
  read playlists/recently played/queue
  enrich local observations with Spotify IDs and metadata
```

The Web Playback SDK is not the default path because it turns Trama into a
Spotify Connect playback device and does not expose Spotify Mix transition
controls.

The first desktop implementation validated inferred events in memory and in Lab
Mode. Once the heuristics were useful enough to trust, the desktop app moved to
local SQLite persistence behind the same repository boundaries.

The current desktop shape is:

```txt
React UI
  -> desktop service
  -> repository interface
  -> Tauri command bridge
  -> local SQLite
  -> repository result
  -> core session derivation
```

This keeps `packages/core` provider-independent and database-independent while
still giving the desktop app a durable event log and session memory across
restarts.

Early event inference should prefer conservative, explainable heuristics:

```txt
first snapshot -> observer attached event
same track + play state change -> pause/resume event
track change near the end -> completed event + next started event
track change early -> skipped event + next started event
recent track returns -> replayed event
```

Each inferred event should carry enough detail for Lab Mode to explain it:
progress, duration, source, timestamp, and confidence.

---

## Main data flow

The normal Trama loop should look like this:

```txt
OS media observation, provider playback state, or demo event
        ↓
normalized ObservedPlayback / Track / Event model
        ↓
local event log
        ↓
session state update
        ↓
candidate pool generation
        ↓
core ranking engine
        ↓
ranked candidates + explanations
        ↓
desktop UI
        ↓
user feedback or Autopilot action
        ↓
provider queue action or demo simulation
        ↓
new event
```

More concretely:

```txt
1. Observe current playback.
2. Normalize provider data.
3. Detect play event changes.
4. Store event locally.
5. Update active session state.
6. Generate or load candidate pool.
7. Score candidates with core engine.
8. Return ranked candidates with explanations.
9. User selects, rejects, or enables Autopilot.
10. Apply queue action through provider adapter.
11. Observe the result and continue.
```

---

## Provider-independent core

The core engine should work with this kind of normalized model:

```ts
type Track = {
  id: string;
  providerIds: Record<string, string>;
  title: string;
  artists: Artist[];
  album?: Album;
  durationMs: number;
  popularity?: number;
  tags?: string[];
};
```

A provider adapter can enrich this model, but should not make the core dependent on provider-specific fields.

Bad:

```ts
function scoreCandidate(track: SpotifyApi.TrackObjectFull) {
  // ...
}
```

Good:

```ts
function scoreCandidate(candidate: CandidateTrack, session: SessionState) {
  // ...
}
```

---

## Session state

The session should be represented explicitly.

Example:

```ts
type SessionState = {
  id: string;
  startedAt: string;
  updatedAt: string;
  seedTrackId?: string;
  currentTrackId?: string;
  recentTrackIds: string[];
  completedTrackIds: string[];
  skippedTrackIds: string[];
  feedbackSummary: FeedbackSummary;
  mode: SessionMode;
  controls: SessionControls;
};
```

The session state should answer:

```txt
What is the current direction?
What has been accepted?
What has been rejected?
What has been repeated?
What should be avoided?
How strict should continuity be?
How much exploration is allowed?
```

---

## Event-driven design

Trama should treat listening behavior as events.

Important event types:

```txt
track_started
track_completed
track_skipped
track_replayed
track_paused
track_resumed
feedback_added
candidate_queued
candidate_rejected
session_started
session_reset
autopilot_enabled
autopilot_disabled
```

Events should be persisted before they influence ranking when possible.

This gives Trama a debuggable history:

```txt
what happened
when it happened
what the system inferred
how ranking changed afterward
```

---

## Ranking pipeline

The ranking pipeline should be explicit:

```txt
candidate pool
  -> filter invalid candidates
  -> compute feature values
  -> apply rewards
  -> apply penalties
  -> compute final score
  -> generate explanation
  -> return ranked candidates
```

The ranking engine should produce diagnostics in development mode.

Example output:

```ts
type RankedCandidate = {
  track: Track;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: RecommendationReason[];
  warnings?: RecommendationWarning[];
};
```

A recommendation without explanation is incomplete.

---

## Candidate generation

Candidate generation can come from multiple sources:

```txt
user playlists
liked/library tracks
recently played tracks
artist top tracks
search results
demo candidate pools
future provider adapters
local history
```

Candidate generation should be separate from candidate ranking.

The generator asks:

```txt
What tracks are possible?
```

The ranker asks:

```txt
Which possible track belongs next?
```

Do not collapse these into one function.

---

## Autopilot architecture

Autopilot should be a thin orchestration layer.

It should not contain ranking logic.

Autopilot responsibilities:

```txt
monitor active session
ask core engine for ranked candidates
choose top candidate according to config
apply provider queue action
avoid duplicate queue inserts
respect cooldowns and user settings
record queue actions as events
```

The current desktop autopilot is intentionally conservative:

```txt
only runs when autoplay is enabled in session controls
waits until the observed local track is around 70% complete
rebuilds the real Spotify candidate pool at decision time
queues at most one top pick per current track
backs off after provider failures with a cooldown
```

Autopilot should be easy to disable.

It should never hide what it is doing.

---

## Demo mode architecture

Demo mode should use the same core engine as real provider mode.

```txt
demo playback simulator
        ↓
normalized events
        ↓
same local event log
        ↓
same ranking engine
        ↓
same UI components
```

Avoid building a fake UI path that bypasses the engine.

Demo mode should prove the architecture, not just decorate the app.

---

## UI architecture

The desktop UI should be organized around features, not random components.

Suggested feature areas:

```txt
features/
  now-playing/
  session/
  candidates/
  feedback/
  autopilot/
  lab-mode/
  demo-mode/
  provider-connect/
```

Each feature can have:

```txt
components/
hooks/
services/
types/
```

Presentational components should be easy to reuse in demo mode and provider mode.

---

## State management

Use simple state management first.

Avoid introducing complex global state too early.

Preferred approach:

```txt
local component state for UI-only state
feature hooks for feature state
query/cache layer for async data if needed
repository calls for persisted state
core engine for derived ranking state
```

Global state should be limited to:

```txt
active session
provider connection status
current playback
ranked candidates
autopilot status
demo mode status
```

---

## Error handling

Errors should be typed and visible.

Provider errors should not crash the core engine.

Example error categories:

```txt
ProviderAuthError
ProviderRateLimitError
ProviderPlaybackUnavailableError
ProviderPremiumRequiredError
ProviderQueueError
DatabaseMigrationError
RankingInputError
DemoScenarioError
```

The UI should show useful recovery steps.

Example:

```txt
Spotify connection expired. Reconnect your account.
No active Spotify playback found. Start playing a track and try again.
Queue insertion failed. You may need Spotify Premium.
Demo scenario failed to load. Check fixture data.
```

---

## Testing strategy

The highest-priority tests are for `packages/core`.

Required core tests:

```txt
skip detection
completion detection
score calculation
recent repeat penalty
skip penalty
explicit feedback reward
mood break penalty
recommendation explanation generation
session state updates
ranking determinism
```

Provider adapter tests should mock API responses.

Database tests should use an isolated test database.

UI tests can start with smoke tests and component tests around key views.

Demo fixtures should be validated so they do not break the UI.

---

## Development modes

Trama should support at least two modes:

### Demo mode

```txt
no provider API required
uses mock playback
uses mock candidate pools
runs full ranking engine
ideal for contributors
```

### Provider mode

```txt
requires provider setup
uses real playback state
uses real queue actions
stores local event history
```

Future modes may include:

```txt
local files mode
ListenBrainz mode
Last.fm mode
Apple Music adapter
YouTube Music adapter
```

---

## Security and privacy boundaries

Trama should minimize sensitive data handling.

Principles:

```txt
store only what is needed
prefer local storage
do not collect analytics by default
do not send listening history to a central server
do not log access tokens
do not commit API keys
use environment variables or local config
use OAuth PKCE for desktop auth
```

Provider tokens, if stored, should be handled carefully and documented.

---

## Configuration

Configuration should be explicit.

Possible config files:

```txt
.trama/config.json
.env.local
```

Example config values:

```txt
SPOTIFY_CLIENT_ID
SPOTIFY_REDIRECT_URI
TRAMA_DEMO_MODE
TRAMA_LOG_LEVEL
```

Never require contributors to use a shared Spotify client ID.

---

## Logging

Logs should help debug the recommendation loop.

Useful logs:

```txt
provider connection state
playback polling result
detected event
session update
candidate pool size
ranking duration
top candidate score
queue insertion result
```

Avoid logging:

```txt
access tokens
refresh tokens
full private playlist contents unnecessarily
personal data not needed for debugging
```

---

## Performance expectations

The ranking engine should feel instant for normal candidate pools.

Initial target:

```txt
candidate pool size: 50-500 tracks
ranking time: under 100ms locally for v0
UI update: responsive
playback polling: conservative and configurable
```

Avoid expensive models or network calls inside the ranking loop.

Provider calls should happen before ranking or after user action, not during every score calculation.

---

## Future learning architecture

Future versions may add lightweight learning.

Preferred future direction:

```txt
transparent weight adaptation
local contextual bandit
session-specific preference updates
offline evaluation harness
```

Avoid:

```txt
remote black-box recommender
LLM-driven ranking loop
training on provider content in a way that violates policies
unexplainable score outputs
```

Any learning system must preserve:

```txt
local-first behavior
user control
debuggability
recommendation explanations
provider-independent core
```

---

## Anti-patterns

Avoid these architectural anti-patterns:

```txt
React component calls Spotify API directly and ranks tracks inline.
Spotify response objects are stored as core session state.
Ranking engine writes directly to SQLite.
Autopilot silently queues tracks without event records.
Demo mode uses different recommendation logic than provider mode.
Recommendation explanations are generated separately from score breakdowns.
LLM calls decide the next track in v0/v1.
A central server becomes required for basic functionality.
```

---

## Architectural north star

The correct architecture should allow this:

```txt
Given:
  a current track
  a session history
  a feedback history
  a candidate pool
  a ranking config

The core engine can:
  rank candidates
  explain each score
  update session state
  run tests
  work without Spotify
  work without the desktop app
  work without a network connection
```

If that remains true, Trama’s architecture is on the right path.

