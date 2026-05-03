# Roadmap

This roadmap defines Trama’s planned development path.

Trama should grow from a clear core loop, not from scattered features.

The core loop is:

```txt
observe or simulate session
  -> store event
  -> update session state
  -> generate candidates
  -> rank candidates
  -> explain recommendations
  -> collect feedback
  -> update session
````

Every release should strengthen this loop.

---

## Roadmap principles

### Build the engine before the spectacle

A polished UI matters, but the project should not become a visual shell around weak recommendation logic.

The engine must be real enough to inspect, test, and improve.

---

### Demo Mode comes early

Demo Mode is not optional.

It allows people to understand and contribute to Trama without:

```txt
Spotify Premium
Spotify Developer setup
API credentials
provider-specific errors
```

Demo Mode should use the same core engine as provider mode.

---

### Spotify is an adapter

Spotify integration is useful, but it should not define the project.

The project should remain meaningful even if Spotify is disconnected, unavailable, or limited.

---

### Keep v0 narrow but impressive

A strong v0 should feel complete because the loop works end-to-end.

It does not need every possible feature.

---

# Release phases

## Phase 0: Foundation

Goal:

```txt
Establish the project thesis, architecture, data model, and contribution rules.
```

Deliverables:

```txt
README.md
docs/project-thesis.md
docs/product-principles.md
docs/architecture.md
docs/ranking-engine.md
docs/data-model.md
docs/ui-principles.md
docs/spotify-integration.md
docs/roadmap.md
AGENTS.md
CONTRIBUTING.md
```

Success criteria:

```txt
A contributor can understand what Trama is.
A coding agent can follow architecture boundaries.
The project has a clear public framing.
The first implementation tasks are obvious.
```

Status:

```txt
planned / in progress
```

---

## Phase 1: Core engine MVP

Goal:

```txt
Build the provider-independent recommendation engine.
```

Scope:

```txt
packages/core
packages/demo-fixtures
basic tests
```

Features:

```txt
Track, Session, PlayEvent, FeedbackEvent types
candidate ranking function
score breakdown
recommendation reasons
recommendation warnings
basic skip detection
basic completion detection
recent repeat penalty
skip risk penalty
completion affinity reward
explicit feedback effect
ranking diagnostics
fixture-based tests
```

Out of scope:

```txt
Spotify integration
desktop UI polish
LLMs
deep learning
central server
cloud sync
```

Success criteria:

```txt
Given a fake session and candidate pool, Trama ranks candidates.
Every candidate has a score breakdown.
Every candidate has recommendation reasons.
Tests cover core ranking behavior.
The core engine runs without Spotify.
```

Example command:

```bash
pnpm test --filter @trama/core
```

---

## Phase 2: Demo Mode UI

Goal:

```txt
Make the core engine visible through a polished demo interface.
```

Scope:

```txt
apps/desktop
packages/demo-fixtures
packages/core integration
```

Features:

```txt
Tauri + React desktop shell
Demo Scenario Picker
Now Playing panel
Session Direction display
Chain Health indicator
Up Next Candidate cards
Recommendation reasons
Feedback buttons
Session Controls panel
Event Timeline
Lab Mode score breakdown
```

Out of scope:

```txt
real Spotify login
real playback observation
real queue insertion
multi-provider support
cloud sync
```

Success criteria:

```txt
A user can open Trama without Spotify.
A user can select a demo scenario.
The app shows ranked candidates using the real core engine.
Feedback changes ranking.
Lab Mode shows score breakdowns.
The UI makes the session legible within one minute.
```

This phase should be visually polished enough for screenshots and early LinkedIn sharing.

---

## Phase 3: Local persistence

Goal:

```txt
Persist sessions, events, tracks, feedback, and ranking state locally.
```

Scope:

```txt
packages/db
apps/desktop integration
```

Features:

```txt
SQLite schema
migrations
TrackRepository
SessionRepository
EventRepository
FeedbackRepository
QueueActionRepository
local settings
demo seed data
session history persistence
```

Out of scope:

```txt
cloud sync
remote accounts
shared user profiles
central analytics
```

Success criteria:

```txt
Demo sessions persist across app restarts.
Feedback events are stored.
Play events are stored.
Session summary can be recomputed.
Ranking can use local event history.
No central server is required.
```

---

## Phase 4: Spotify adapter MVP

Goal:

```txt
Connect Trama to real Spotify playback while preserving provider boundaries.
```

Scope:

```txt
packages/spotify-adapter
apps/desktop provider setup
packages/db provider connection state
```

Features:

```txt
Spotify OAuth PKCE
local Spotify config
provider connection status
current playback polling
normalized PlaybackState
track mapping
recently played import
basic playlist import
typed Spotify errors
provider setup UI
```

Out of scope:

```txt
Autopilot
aggressive queue control
playlist editing
shared Spotify Client ID
commercial usage
```

Success criteria:

```txt
A developer can configure their own Spotify Client ID.
A user can connect Spotify locally.
Trama can display current playback.
Trama can infer basic track_started events.
Trama can map Spotify tracks into Trama models.
Demo Mode still works without Spotify.
```

---

## Phase 5: Queue control MVP

Goal:

```txt
Let users queue ranked candidates through the provider adapter.
```

Scope:

```txt
spotify-adapter queue
QueueAction persistence
UI action flow
```

Features:

```txt
Add selected candidate to Spotify queue
record queue actions
queue success/failure state
Premium-required error handling
duplicate queue prevention
candidate rejected event
manual queue action from CandidateCard
```

Out of scope:

```txt
full Autopilot
multi-track queue management
advanced queue ordering guarantees
playlist creation
```

Success criteria:

```txt
User can select a ranked candidate.
Trama attempts to add it to Spotify queue.
Queue action is recorded locally.
Failures show clear recovery information.
Ranking updates after candidate rejection or queue action.
```

---

## Phase 6: Autopilot v0

Goal:

```txt
Automatically maintain the next track while keeping the user in control.
```

Scope:

```txt
Autopilot orchestration layer
UI status
event persistence
provider queue action
```

Features:

```txt
Autopilot toggle
watch current track progress
choose top-ranked candidate
queue one candidate at a time
avoid duplicates
record Autopilot actions
pause on repeated failures
show Autopilot status
manual override
```

Out of scope:

```txt
complex multi-track queue planning
remote scheduling
background server
hidden automatic behavior
```

Success criteria:

```txt
Autopilot can queue one next track based on current ranking.
User can see what Autopilot did and why.
User can disable Autopilot instantly.
Autopilot does not silently spam the queue.
Autopilot actions appear in the event timeline.
```

---

## Phase 7: First public release

Goal:

```txt
Release a polished v0 that demonstrates Trama’s thesis end-to-end.
```

Expected version:

```txt
v0.1.0
```

Required features:

```txt
provider-independent core engine
demo mode
polished desktop UI
local SQLite persistence
Spotify adapter setup
current playback observation
manual queue insertion
recommendation explanations
feedback buttons
Lab Mode
event timeline
clear docs
contributor guide
AGENTS.md
```

Optional but strong:

```txt
Autopilot v0
session history view
screenshots in README
short demo video
GitHub issue templates
PR template
first good-first-issues
```

Release criteria:

```txt
The app can be run locally.
Demo Mode works without Spotify.
Core tests pass.
Spotify setup is documented.
No secrets are committed.
UI feels coherent.
Docs explain project boundaries.
LinkedIn post can show real screenshots.
```

---

# v0.1 feature checklist

## Core

```txt
[ ] normalized Track type
[ ] normalized Artist type
[ ] normalized Session type
[ ] PlayEvent type
[ ] FeedbackEvent type
[ ] CandidateTrack type
[ ] RankedCandidate type
[ ] scoreCandidate()
[ ] rankCandidates()
[ ] score breakdown
[ ] recommendation reasons
[ ] recommendation warnings
[ ] ranking diagnostics
[ ] skip detection
[ ] completion detection
[ ] recent repeat penalty
[ ] skip risk penalty
[ ] feedback effect
[ ] deterministic tests
```

## Demo Mode

```txt
[ ] demo tracks
[ ] demo artists
[ ] demo playlists
[ ] demo sessions
[ ] demo candidate pools
[ ] late-night scenario
[ ] gym scenario
[ ] study scenario
[ ] broken session scenario
[ ] feedback simulation
[ ] scenario picker
```

## Desktop UI

```txt
[ ] app shell
[ ] now playing card
[ ] session direction badge
[ ] chain health meter
[ ] candidate list
[ ] candidate card
[ ] recommendation reason list
[ ] feedback bar
[ ] session controls
[ ] event timeline
[ ] Lab Mode panel
[ ] Demo Mode panel
[ ] provider setup screen
[ ] error callout
[ ] empty states
```

## Local persistence

```txt
[ ] SQLite setup
[ ] migration system
[ ] tracks table
[ ] artists table
[ ] sessions table
[ ] play_events table
[ ] feedback_events table
[ ] queue_actions table
[ ] repositories
[ ] local settings
```

## Spotify adapter

```txt
[ ] OAuth PKCE skeleton
[ ] local config loading
[ ] token storage strategy
[ ] current playback client
[ ] playback polling
[ ] Spotify-to-Trama track mapping
[ ] recently played import
[ ] playlist import
[ ] add-to-queue
[ ] typed errors
[ ] connection status UI
```

## Docs and repo

```txt
[ ] README
[ ] project thesis
[ ] product principles
[ ] architecture
[ ] ranking engine docs
[ ] data model docs
[ ] UI principles
[ ] Spotify integration docs
[ ] roadmap
[ ] AGENTS.md
[ ] CONTRIBUTING.md
[ ] issue templates
[ ] PR template
[ ] license
```

---

# v0.2: Better ranking

Goal:

```txt
Make the ranking engine feel meaningfully adaptive.
```

Possible features:

```txt
playlist co-occurrence graph
playlist adjacency scoring
artist acceptance/rejection memory
feedback-weighted session updates
better skip category modeling
better mood break risk
session mode presets
candidate source diversity
candidate filtering improvements
score calibration
fixture evaluation harness
```

Success criteria:

```txt
Feedback visibly changes ranking.
Repeated skips produce clear penalties.
Completed tracks produce clear direction.
Candidate explanations remain grounded.
Fixture tests cover multiple session types.
```

---

# v0.3: Better UX

Goal:

```txt
Make Trama feel like a polished daily companion.
```

Possible features:

```txt
improved visual identity
better first-run onboarding
session history view
comparison between candidate versions
better Lab Mode
keyboard shortcuts
compact mode
system tray mode
provider troubleshooting
import progress UI
```

Success criteria:

```txt
New users understand Trama quickly.
Power users can inspect the engine.
Contributor screenshots look strong.
The UI feels independent, not like a platform clone.
```

---

# v0.4: Adapter expansion

Goal:

```txt
Reduce dependency on one provider.
```

Possible adapters:

```txt
ListenBrainz
Last.fm
local files
Apple Music
YouTube Music
```

Potential adapter categories:

```txt
playback provider
history provider
metadata provider
candidate provider
queue provider
```

Success criteria:

```txt
Provider interface is stable.
Core engine does not change for each adapter.
Demo Mode still works.
Spotify remains optional.
```

---

# v0.5: Local learning experiments

Goal:

```txt
Explore lightweight local learning without sacrificing transparency.
```

Possible features:

```txt
adaptive scoring weights
session-specific preference updates
local contextual bandit prototype
reward function experiments
user-resettable learning state
offline fixture evaluation
```

Non-goals:

```txt
remote recommender
LLM ranking loop
training on provider content
opaque model output
centralized listening data
```

Success criteria:

```txt
Learning improves behavior in fixtures.
User can inspect or reset learned state.
Explanations remain meaningful.
Core remains provider-independent.
```

---

# v1.0 vision

Trama v1.0 should be a stable open-source desktop companion for session-aware queue ranking.

v1.0 should include:

```txt
strong local core engine
polished desktop UI
first-class Demo Mode
local persistence
at least one real provider adapter
transparent recommendation explanations
feedback-driven adaptation
safe Autopilot
developer-friendly architecture
good contribution pipeline
```

v1.0 should not require:

```txt
central server
cloud account
LLM API keys
shared provider credentials
commercial platform access
```

---

# What to avoid before v1.0

Avoid adding:

```txt
social feeds
user accounts
cloud sync
monetization
LLM chat
heavy ML models
mobile app
browser extension
multi-user sessions
public recommendation analytics
playlist marketplace features
```

These may be interesting later, but they distract from the core loop.

---

# Suggested first GitHub issues

## Core

```txt
Implement normalized core types
Implement rankCandidates baseline
Implement score breakdown model
Implement recommendation reasons
Implement skip detection helper
Implement completion detection helper
Add ranking fixture tests
```

## Demo Mode

```txt
Create late-night demo scenario
Create gym demo scenario
Create broken-session demo scenario
Build demo playback simulator
Validate demo fixture schema
```

## UI

```txt
Build AppShell
Build NowPlayingCard
Build CandidateCard
Build FeedbackBar
Build SessionControlsPanel
Build EventTimeline
Build LabModePanel
Build DemoScenarioPicker
```

## DB

```txt
Set up SQLite package
Add initial migrations
Implement TrackRepository
Implement SessionRepository
Implement EventRepository
Implement QueueActionRepository
```

## Spotify

```txt
Add Spotify PKCE auth skeleton
Add Spotify client wrapper
Map Spotify track to Trama Track
Implement current playback polling
Implement add-to-queue action
Add provider setup UI
```

## Docs

```txt
Add issue templates
Add PR template
Add local setup guide
Add Spotify setup troubleshooting
Add architecture diagram
Add screenshots after UI exists
```

---

# Public release narrative

The first public release should be easy to explain:

```txt
Trama is an open-source, local-first adaptive queue engine for music sessions.

It does not try to replace your music platform.

It watches the current session, learns from skips/completions/feedback, ranks possible next tracks, and explains why each candidate belongs next.
```

LinkedIn-ready version:

```txt
Most music apps understand your long-term taste.

Trama is an open-source experiment in understanding the current session.
```

---

# Guiding sentence

Build the smallest complete system that proves the thesis:

> The next track should belong to the session, not just to the user.

