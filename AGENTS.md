# AGENTS.md

This file defines instructions for coding agents working on Trama.

These rules apply to Codex, GitHub Copilot, Claude Code, Cursor, or any other agentic coding tool used in this repository.

Trama is not just a desktop app.

Trama is an open-source, local-first adaptive queue engine for music sessions.

Preserve the thesis:

> Do not recommend the best track in general. Recommend the track that belongs next.

---

## Project summary

Trama is a modular music recommendation experiment.

It focuses on:

```txt
session-aware queue ranking
local-first event tracking
transparent scoring
recommendation explanations
provider adapters
demo mode
open-source contribution
````

Trama should not be built as:

```txt id="aty9pb"
a Spotify clone
a streaming service
a playlist farm
an AI chatbot
a generic dashboard
a centralized recommendation platform
```

---

## Non-negotiable architecture rule

Preserve this separation:

```txt id="zjkmwk"
core engine != provider adapter != UI
```

This means:

```txt id="5pvq2a"
packages/core owns ranking and session logic
packages/spotify-adapter owns Spotify API integration
packages/db owns persistence
packages/demo-fixtures owns mock/demo data
apps/desktop owns UI and app shell
```

Do not put provider API calls inside the core engine.

Do not put ranking logic inside React components.

Do not put database-specific logic inside the ranking engine.

Do not make Spotify required for the core engine to run.

---

## Required mental model

Trama’s core loop is:

```txt id="9p931h"
observe or simulate session
  -> store event
  -> update session state
  -> generate candidates
  -> rank candidates
  -> explain recommendations
  -> collect feedback
  -> update session
```

Every significant feature should support this loop.

If a feature does not support this loop, question it before implementing.

---

## Public framing rules

Use this framing:

```txt id="o8rhi3"
local-first adaptive queue engine
session-aware music discovery
transparent recommendation logic
user-controlled feedback layer
provider-independent core
```

Avoid this framing:

```txt id="qnxqua"
Spotify replacement
better Spotify algorithm
Spotify Radio clone
YouTube clone
AI music brain
LLM-powered recommender
```

Do not describe Trama as copying or cloning another platform’s recommender.

---

## Spotify rules

Spotify is only one provider adapter.

Do not use Spotify branding in ways that imply affiliation, endorsement, or co-branding.

Do not name features as if they are official Spotify features.

Do not use Spotify green as Trama’s primary brand identity.

Do not train ML/AI models on Spotify Platform data or Spotify Content.

Do not make Spotify response objects part of core engine types.

Do not require a shared Spotify client ID.

Do not commit:

```txt id="gy66j2"
Spotify client secrets
access tokens
refresh tokens
personal account data
private playlist dumps
```

Use OAuth PKCE for Spotify auth.

Prefer local contributor setup where each developer creates their own Spotify Developer app.

Demo Mode must work without Spotify.

---

## LLM and ML rules

Do not add LLMs to the core ranking loop.

Do not add OpenAI, Anthropic, Gemini, or other LLM dependencies unless explicitly requested.

Do not market deterministic scoring as “AI”.

Do not add deep learning to v0/v1.

The first engine should be:

```txt id="58b3eq"
deterministic
local-first
explainable
testable
fast
```

Future ML experiments may be added only if they are:

```txt id="r5icdg"
local-first
optional
documented
resettable
explainable enough for users
policy-reviewed
```

Preferred first implementation:

```txt id="x9csrl"
weighted scoring
clear rewards
clear penalties
visible score breakdown
recommendation reasons
fixture-based tests
```

---

## Ranking engine rules

All ranking logic belongs in `packages/core`.

The ranking engine must produce:

```txt id="vhtwr7"
ranked candidates
numeric scores
score breakdowns
recommendation reasons
warnings when appropriate
diagnostics in development mode
```

A recommendation without explanation is incomplete.

Explanations must be grounded in score components.

Good explanation:

```txt id="953uv9"
Matches recently completed tracks.
Not played recently.
Avoids artists skipped earlier in this session.
```

Bad explanation:

```txt id="m83jw4"
Recommended by AI.
You might like this.
Good vibes.
```

When changing ranking logic, add or update tests.

---

## Candidate generation rules

Keep candidate generation separate from ranking.

Candidate generation asks:

```txt id="4b7vdp"
What tracks are possible?
```

Ranking asks:

```txt id="a29gkd"
Which possible track belongs next?
```

Do not merge these into one large function.

Candidate sources may include:

```txt id="8gh59t"
demo pools
user playlists
library tracks
recently played
provider search
current artist
accepted artists
playlist co-occurrence
```

Candidate generation may live outside `packages/core` if it depends on providers or persistence.

Provider-independent candidate utilities may live in `packages/core`.

---

## Event model rules

Trama should be event-driven.

Important event types include:

```txt id="ugy6lg"
track_started
track_completed
track_skipped
track_replayed
feedback_added
candidate_queued
candidate_rejected
session_started
session_reset
autopilot_enabled
autopilot_disabled
```

Do not update ranking state through hidden mutations.

If user behavior changes the session, record an event.

If Autopilot queues a track, record an event.

If feedback changes ranking, record an event.

State can be derived from events when possible.

---

## Data model rules

Use normalized Trama models.

Do not leak provider response objects into core models.

Bad:

```ts id="z0kahf"
function scoreCandidate(track: SpotifyApi.TrackObjectFull) {
  // ...
}
```

Good:

```ts id="mb6c1r"
function scoreCandidate(candidate: CandidateTrack, session: SessionState) {
  // ...
}
```

Use provider IDs as metadata:

```ts id="85phpu"
providerIds: {
  spotify: "spotify:track:..."
}
```

The Trama internal ID should remain provider-independent.

---

## Database rules

Local persistence belongs in `packages/db`.

Use repository-style interfaces.

Do not scatter raw SQL throughout the app.

Do not write directly to SQLite from presentational React components.

Do not allow the ranking engine to depend on the database driver.

Preferred flow:

```txt id="94hq9a"
UI/action
  -> feature service
  -> repository
  -> normalized data
  -> core engine
```

Migrations should be versioned and reviewable.

Never silently delete user session history.

---

## UI rules

The UI should make the session legible.

It should not be a Spotify clone.

It should not be a full music player replacement.

Main UI concepts:

```txt id="1nmevy"
Now Playing
Session Direction
Chain Health
Up Next Candidates
Recommendation Reasons
Feedback
Session Controls
Autopilot
Event Timeline
Lab Mode
Demo Mode
```

The UI should answer:

```txt id="wx3dng"
What is playing?
What direction is the session taking?
Why was this candidate recommended?
How can the user steer the queue?
What changed after feedback?
```

Do not hide engine behavior behind vague UI copy.

Avoid:

```txt id="z99h2u"
AI magic language
fake analytics
unrelated dashboards
social features in v0
complex playlist editors in v0
```

---

## Demo Mode rules

Demo Mode is a first-class feature.

Do not treat it as temporary fake data.

Demo Mode should use the real core engine.

Good Demo Mode:

```txt id="fmcm3x"
mock playback
mock sessions
mock candidate pools
real ranking
real explanations
real feedback updates
real UI components
```

Bad Demo Mode:

```txt id="y83p80"
hardcoded recommendation cards
separate fake ranking path
UI-only mockups that bypass the engine
```

A contributor should be able to clone the repo and understand Trama without setting up Spotify.

---

## Autopilot rules

Autopilot is an orchestration layer.

It should not contain ranking logic.

Autopilot may:

```txt id="qqlur5"
monitor session state
ask core engine for ranked candidates
select a candidate according to config
call provider adapter to queue track
record queue action events
show status in UI
```

Autopilot must not:

```txt id="v9qpqv"
silently queue unexplained tracks
queue duplicates repeatedly
ignore user feedback
continue after repeated provider failures
hide queue actions from the event log
```

Autopilot should always be visible, reversible, and easy to disable.

---

## Testing rules

Prioritize tests for `packages/core`.

Required tests when relevant:

```txt id="8qb35o"
skip detection
completion detection
replay detection
score calculation
recent repeat penalty
skip penalty
completion affinity
explicit feedback reward
mood break penalty
recommendation explanation generation
ranking determinism
session state updates
candidate filtering
```

Provider adapter tests should mock external APIs.

Database tests should use isolated local test databases.

UI tests can start with key component smoke tests.

Do not merge ranking changes without tests.

---

## Performance rules

The ranking engine should be fast.

Initial target:

```txt id="g0f93o"
50-500 candidates ranked locally in under 100ms
```

Do not put network calls inside candidate scoring.

Do not call provider APIs from inside the ranking loop.

Do not run heavy models during normal ranking.

Cache provider metadata where appropriate.

---

## Privacy and security rules

Trama is local-first.

Do not add centralized analytics by default.

Do not send listening history to a remote server by default.

Do not log sensitive provider data.

Do not log tokens.

Do not commit secrets.

When adding telemetry, sync, or cloud features, require explicit product review.

---

## Dependency rules

Keep dependencies minimal.

Before adding a dependency, ask:

```txt id="4x30r8"
Is this necessary?
Can this be implemented clearly without it?
Does this dependency affect desktop bundle size?
Does this dependency add native build complexity?
Does this dependency conflict with local-first goals?
```

Avoid large ML/AI dependencies in v0/v1.

Avoid dependencies that force a server for core functionality.

---

## Documentation rules

When adding or changing a major feature, update relevant docs.

Important docs:

```txt id="v57hxt"
README.md
docs/project-thesis.md
docs/product-principles.md
docs/architecture.md
docs/ranking-engine.md
docs/data-model.md
docs/ui-principles.md
docs/spotify-integration.md
docs/roadmap.md
CONTRIBUTING.md
AGENTS.md
```

If implementation changes the architecture, update `docs/architecture.md`.

If ranking changes, update `docs/ranking-engine.md`.

If data models change, update `docs/data-model.md`.

---

## PR rules for agents

Prefer small, focused PRs.

Good PRs:

```txt id="5ghpvg"
implement core scoreCandidate with tests
add demo scenario fixtures
add CandidateCard component
add Spotify PKCE auth skeleton
add SQLite migration for play_events
```

Bad PRs:

```txt id="602fca"
build the whole app
rewrite architecture without docs
add LLM recommender
mix Spotify auth, UI, ranking, and DB in one PR
```

Every PR should include:

```txt id="nq7crv"
what changed
why it changed
how to test it
what boundaries were preserved
```

---

## Agent workflow hygiene

Prefer targeted file reads over broad repo scans.

Use ripgrep/search before opening large files.

Do not read generated files, dependency folders, build outputs, binaries, datasets, or lockfiles unless explicitly necessary.

Keep responses concise.

When blocked, ask for the smallest missing context instead of scanning the whole repo.

---

## Coding style

Use TypeScript for shared app logic.

Prefer explicit types for core models.

Avoid `any` in core packages.

Use pure functions for ranking logic when possible.

Prefer small functions:

```txt id="e0idnn"
computeSessionSimilarity()
computeSkipRisk()
computeRecentRepeatRisk()
buildRecommendationReasons()
rankCandidates()
```

Avoid giant functions that mix multiple responsibilities.

---

## Error handling rules

Use typed errors for provider, database, and ranking failures.

Do not swallow errors silently.

User-facing errors should explain recovery steps.

Examples:

```txt id="1u6q88"
Spotify is not connected. Reconnect your account.
No active playback found. Start playback and try again.
Queue insertion failed. Spotify Premium may be required.
Demo scenario failed to load. Check fixture data.
```

Avoid exposing raw provider errors directly to normal users unless in Lab Mode.

---

## Lab Mode rules

Lab Mode should expose internals for contributors and power users.

It may show:

```txt id="k8eiq9"
candidate pool
score breakdown
feature values
ranking diagnostics
recent events
feedback effects
provider state
filtering decisions
```

Lab Mode should not be required for normal use.

Lab Mode should not use separate fake ranking logic.

---

## Accessibility rules

UI additions should support:

```txt id="xepjdq"
keyboard navigation
clear focus states
readable contrast
screen-reader labels
non-color-only status indicators
reduced motion where applicable
```

Feedback buttons should have text labels or accessible labels.

Do not rely only on icons.

---

## Files agents should read first

Before major implementation work, read:

```txt id="ns3urk"
README.md
docs/project-thesis.md
docs/product-principles.md
docs/architecture.md
docs/ranking-engine.md
docs/data-model.md
docs/ui-principles.md
docs/spotify-integration.md
AGENTS.md
```

Before touching Spotify integration, also read:

```txt id="gms1xw"
docs/spotify-integration.md
```

Before touching UI, also read:

```txt id="k222f2"
docs/ui-principles.md
```

Before touching ranking, also read:

```txt id="wzv0di"
docs/ranking-engine.md
```

---

## Stop conditions

Stop and ask for human review before implementing:

```txt id="o9ij96"
LLM-based ranking
deep learning
central server requirements
cloud sync
commercialization
Spotify branding changes
new provider policy assumptions
large architecture rewrites
data collection beyond local storage
new telemetry
destructive database migrations
```

---

## Final checklist for generated code

Before finishing any agent task, verify:

```txt id="p6x4hw"
The core engine does not import provider-specific code.
The Spotify adapter does not contain ranking logic.
The UI does not rank candidates inline.
Demo Mode still works without Spotify.
Recommendation explanations are grounded in score components.
No secrets or tokens are committed.
Relevant tests were added or updated.
Relevant docs were updated.
The change supports the session-first thesis.
```

---

## Guiding sentence for agents

When unsure, choose the implementation that makes the current session more legible, the ranking more explainable, and the architecture less coupled.
