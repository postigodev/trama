# Trama

**Trama is an open-source, local-first adaptive queue engine for music sessions.**

## Quick start

```bash
git clone https://github.com/postigodev/trama.git
cd trama
pnpm install
pnpm dev
```

See `docs/setup.md` for detailed setup instructions.

## What is Trama?

Most music apps are good at modeling your long-term taste.

Trama focuses on something more immediate: **the structure of the current listening session**.

What are you listening to right now?  
What did you skip?  
What did you finish?  
What did you ask for more of?  
What would break the thread?

Trama uses those signals to rank what should come next.

> The queue has structure.

---

## Why Trama exists

Music recommendation systems often treat taste as a stable profile.

That works sometimes. But listening is not always stable.

A late-night session, a workout session, a study session, a party session, or a melancholic session can all come from the same person and require very different next tracks.

Trama is built around that distinction:

```txt
long-term taste != current session
````

Instead of asking only:

```txt
What does this user usually like?
```

Trama asks:

```txt
What belongs next in this session?
```

---

## What Trama does

Trama observes listening behavior, stores it locally, and uses transparent ranking logic to suggest or queue the next track.

The first versions focus on:

* local-first session tracking
* skip and completion detection
* explicit feedback such as “more like this” or “less like this”
* candidate scoring
* recommendation explanations
* session-aware queue control
* a Spotify adapter for playback and queue integration
* a demo mode for contributors without Spotify setup

The goal is not to build a black-box recommender.

The goal is to build an inspectable system where users and contributors can understand why a track was recommended.

---

## What Trama is not

Trama is not a music streaming service.

Trama is not a replacement for Spotify, Apple Music, YouTube Music, or any other platform.

Trama is not an attempt to clone another platform’s recommendation system.

Trama is not an LLM-based music chatbot.

Trama is not trained on Spotify content.

Trama is an experimental, open-source queue layer for studying and improving session-aware music discovery.

---

## Core idea

A recommendation is not just an object.

It is a relation.

A track can be good in general but wrong for the current moment.
A song can match your taste profile but still break the session.
A familiar artist can be useful in one context and boring in another.

Trama treats the next track as part of a broader structure:

```txt
current track
  + recent completions
  + recent skips
  + manual feedback
  + session direction
  + candidate pool
  + ranking rules
  = next recommendation
```

---

## Architecture

Trama is designed as a modular system.

```txt
apps/
  desktop/              # Tauri + React desktop companion app

packages/
  core/                 # Session state, ranking engine, scoring explanations
  db/                   # Local SQLite schema, migrations, persistence
  spotify-adapter/      # Spotify OAuth, playback observer, queue control
  demo-fixtures/        # Mock sessions, tracks, and candidate pools
```

The most important separation is:

```txt
core engine != Spotify adapter != UI
```

The ranking engine should work without Spotify.

Spotify is only one possible provider adapter.

---

## Planned first release

The first public release should feel complete enough to demonstrate the thesis.

Planned v0 features:

* desktop companion app
* local SQLite event log
* demo mode with simulated sessions
* current session panel
* ranked “Up Next” candidates
* transparent recommendation explanations
* feedback buttons
* session controls
* Spotify OAuth PKCE setup
* playback observer
* add-to-queue support
* contributor documentation

---

## Recommendation engine

The initial ranking engine is intentionally simple and explainable.

No LLMs are needed for the core.

No deep learning is required for v0.

The first engine will use transparent scoring:

```txt
score =
  session similarity
+ playlist or library affinity
+ artist/context affinity
+ completion reward
+ explicit positive feedback
+ novelty bonus
- skip penalty
- recent repeat penalty
- mood break penalty
```

Each recommendation should return both a score and human-readable reasons.

Example:

```txt
Recommended because:
+ matches the last 3 completed tracks
+ appears in a similar playlist cluster
+ has not been played recently
- slightly higher mainstream penalty
```

Future versions may experiment with local contextual bandits or other lightweight learning approaches, but only if they preserve transparency and local-first behavior.

---

## Local-first by default

Trama should work as a personal tool first.

Listening events, feedback, ranking state, and session history should be stored locally by default.

This keeps the project aligned with its core values:

* user control
* inspectability
* privacy
* low infrastructure requirements
* open-source contribution
* no dependency on a central recommendation server

---

## Spotify integration

Trama may include a Spotify adapter for users who want to connect their account.

The adapter is responsible for:

* OAuth PKCE authentication
* reading current playback state
* reading recently played tracks
* importing user playlists when allowed
* adding selected tracks to the queue

Users running Trama locally should create their own Spotify Developer app and provide their own client ID.

Trama should avoid Spotify branding confusion and should not present itself as affiliated with, endorsed by, or sponsored by Spotify.

---

## Demo mode

Not every contributor will have Spotify Premium, API access, or a configured developer app.

For that reason, Trama should include a demo mode from the beginning.

Demo mode should provide:

* mock tracks
* mock listening sessions
* simulated skips and completions
* candidate pools
* ranking explanations
* UI previews

This allows contributors to work on the core engine, UI, ranking logic, and documentation without external API setup.

---

## Project values

Trama should be:

### Transparent

Users should understand why something was recommended.

### Local-first

The default system should not require a central server.

### Modular

The recommendation engine should not depend directly on Spotify or any other provider.

### Session-aware

The current session matters more than the average user profile.

### Contributor-friendly

The project should be easy to run, inspect, test, and extend.

### Non-commercial by default

Trama begins as an open-source research and utility project, not a startup or streaming product.

---

## Contributing

Trama is early.

Good contribution areas will include:

* ranking logic
* session modeling
* local database design
* Spotify adapter work
* demo fixtures
* UI/UX design
* recommendation explanations
* testing infrastructure
* documentation
* additional provider adapters

Planned issue labels:

```txt
good first issue
help wanted
ranking
ui
spotify-adapter
local-first
docs
demo-mode
research
```

A full `CONTRIBUTING.md` will define setup instructions, branch naming, testing expectations, and contribution guidelines.

---

## Development status

Trama is currently in early planning.

The initial goal is to build a polished v0 that demonstrates the full loop:

```txt
observe session
  -> generate candidates
  -> rank next tracks
  -> explain recommendations
  -> collect feedback
  -> update the session
```

---

## License

License TBD.

Likely candidates:

* MIT for maximum adoption
* Apache-2.0 for clearer patent language
* AGPL-3.0 if the project later includes server-side components and wants stronger open-source guarantees
