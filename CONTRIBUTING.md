# Contributing to Trama

Thanks for your interest in contributing to Trama.

Trama is an open-source, local-first adaptive queue engine for music sessions.

The project explores one core question:

> What track belongs next in the current listening session?

This guide explains how to set up the project, understand the architecture, choose an issue, and submit a contribution.

---

## Project thesis

Before contributing, please understand the basic thesis:

```txt
long-term taste != current session
````

Most music apps are good at modeling long-term taste.

Trama focuses on the current listening session: the track playing now, recent skips, recent completions, explicit feedback, and what would or would not break the thread.

Trama is not trying to replace a music platform.

Trama is trying to make session-aware queue ranking transparent, local-first, and open-source.

---

## What Trama is

Trama is:

```txt
a local-first queue engine
a desktop companion app
a recommendation system playground
a transparent scoring engine
a provider-adapter architecture
an open-source experiment in music discovery UX
```

---

## What Trama is not

Trama is not:

```txt
a streaming service
a Spotify replacement
a clone of another platform’s recommender
an LLM music chatbot
a centralized recommendation platform
a commercial music app
```

Please keep this boundary clear in code, docs, issues, and PRs.

---

## Repository structure

Expected structure:

```txt
trama/
  apps/
    desktop/              # Tauri + React desktop app

  packages/
    core/                 # Ranking engine, session logic, explanations
    db/                   # SQLite schema, repositories, migrations
    spotify-adapter/      # Spotify auth, playback, queue integration
    demo-fixtures/        # Mock tracks, sessions, candidate pools
    shared/               # Small shared utilities

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
```

The most important architecture rule:

```txt
core engine != provider adapter != UI
```

---

## Recommended reading

Before contributing, read:

```txt
README.md
docs/product-principles.md
docs/architecture.md
```

If you are working on ranking:

```txt
docs/ranking-engine.md
docs/data-model.md
```

If you are working on UI:

```txt
docs/ui-principles.md
```

If you are working on Spotify:

```txt
docs/spotify-integration.md
```

If you are using an AI coding agent:

```txt
AGENTS.md
```

---

## Development setup

Exact setup may change as the repo evolves.

Expected initial setup:

```bash
git clone https://github.com/<org-or-user>/trama.git
cd trama

pnpm install
pnpm dev
```

If the project uses Tauri, you may also need Rust installed.

Useful references:

```txt
Node.js
pnpm
Rust
Tauri prerequisites
SQLite
```

The project should support Demo Mode without a Spotify account.

---

## Demo Mode

Demo Mode is the easiest way to contribute.

It should work without:

```txt
Spotify Premium
Spotify API keys
provider setup
external music accounts
```

Demo Mode uses mock data but should run through the real Trama core engine.

You can contribute to:

```txt
ranking logic
candidate cards
feedback UI
session timeline
Lab Mode
demo scenarios
score explanations
tests
docs
```

without setting up Spotify.

---

## Spotify setup

Spotify integration is optional for contributors.

If you want to work on the Spotify adapter, you should create your own Spotify Developer app.

Expected local setup:

```txt
1. Create a Spotify Developer app.
2. Add the redirect URI used by Trama.
3. Copy your Client ID.
4. Add it to local config.
5. Run Trama and connect Spotify.
```

Example local config:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/auth/spotify/callback
```

Do not commit:

```txt
client secrets
access tokens
refresh tokens
personal Spotify data
private playlist dumps
```

The Spotify adapter should use OAuth PKCE.

See:

```txt
docs/spotify-integration.md
```

---

## Development Mode limitations

Spotify apps in development mode may have user limits, allowlist requirements, Premium requirements, and endpoint restrictions.

Because of that:

```txt
Demo Mode must remain first-class.
The core engine must work without Spotify.
Contributors should use their own Spotify Developer app.
Trama should not depend on one shared Spotify Client ID.
```

If Spotify requests fail with 403, the account may not be allowlisted for that Spotify Developer app.

---

## Good first contributions

Good first issues may include:

```txt
add a demo scenario
write tests for skip detection
write tests for completion detection
improve recommendation reason copy
build an EmptyState component
build a ScoreBadge component
add fixture validation
improve README setup instructions
add a small ranking feature with tests
```

Good first UI contributions:

```txt
CandidateCard
FeedbackBar
EventTimeline
ChainHealthMeter
DemoScenarioPicker
ProviderStatusBadge
```

Good first core contributions:

```txt
detectSkip()
detectCompletion()
computeRecentRepeatRisk()
computeSkipRisk()
buildRecommendationReasons()
```

Good first docs contributions:

```txt
clarify setup
add screenshots
explain demo scenarios
improve architecture diagrams
add troubleshooting notes
```

---

## Contribution areas

### Ranking

Ranking work lives in:

```txt
packages/core
```

Good ranking contributions:

```txt
better score components
clearer score breakdowns
better penalty/reward functions
deterministic tests
fixture-based evaluation
recommendation explanations
diagnostics for Lab Mode
```

Avoid:

```txt
opaque model outputs
LLM ranking
provider-specific fields in core
ranking directly inside UI components
```

---

### UI/UX

UI work lives mainly in:

```txt
apps/desktop
```

Good UI contributions:

```txt
make the session more legible
improve candidate cards
improve feedback interactions
improve Lab Mode
improve Demo Mode
add clear error states
improve accessibility
```

Avoid:

```txt
copying streaming app UIs
unrelated dashboards
social features in v0
chatbot UI
fake AI language
```

---

### Provider adapters

Provider adapters should live in their own package.

Current planned adapter:

```txt
packages/spotify-adapter
```

Good adapter contributions:

```txt
OAuth PKCE
current playback observation
recently played import
playlist import
queue insertion
provider error handling
mapping provider objects to Trama models
```

Avoid:

```txt
ranking inside adapter
provider objects in core
committed credentials
excessive scopes
tight polling loops
```

---

### Demo fixtures

Demo fixtures live in:

```txt
packages/demo-fixtures
```

Good fixture contributions:

```txt
mock tracks
mock artists
mock playlists
mock sessions
mock feedback events
candidate pools
scenario metadata
fixture validation
```

Useful scenarios:

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

### Documentation

Docs are a major part of Trama.

Good docs contributions:

```txt
architecture explanations
setup instructions
ranking examples
Spotify troubleshooting
UI principles
screenshots
diagrams
contributor guides
```

If your code changes project behavior, update the relevant docs.

---

## Branch naming

Suggested branch names:

```txt
feat/core-ranking-baseline
feat/demo-scenarios
feat/spotify-pkce
feat/candidate-card
fix/skip-detection
docs/setup-guide
test/ranking-explanations
refactor/provider-boundary
```

Use prefixes:

```txt
feat/
fix/
docs/
test/
refactor/
chore/
```

---

## Commit style

Use clear, conventional-style commits when possible.

Examples:

```bash
git commit -m "feat(core): add baseline candidate scoring"
git commit -m "test(core): cover skip risk penalty"
git commit -m "docs: clarify Spotify setup"
git commit -m "feat(ui): add candidate card explanations"
```

Avoid vague commits:

```bash
git commit -m "stuff"
git commit -m "fix"
git commit -m "updates"
```

---

## Pull request expectations

A good PR should explain:

```txt
what changed
why it changed
how to test it
what docs were updated
what architectural boundaries were preserved
```

Suggested PR template:

```md
## Summary

## Why this change matters

## How to test

## Screenshots or recordings

## Architecture notes

## Checklist
- [ ] Core does not import provider-specific code
- [ ] UI does not contain ranking logic
- [ ] Demo Mode still works
- [ ] Recommendation explanations are grounded in score components
- [ ] Tests added or updated
- [ ] Docs added or updated
```

---

## Testing

Core ranking logic should have tests.

Prioritize tests for:

```txt
skip detection
completion detection
score calculation
feedback effects
recent repeat penalty
mood break penalty
recommendation explanations
ranking determinism
candidate filtering
```

Expected commands may include:

```bash
pnpm test
pnpm lint
pnpm typecheck
```

If a package has its own test command, document it in that package.

---

## Ranking test expectations

When changing ranking behavior, include fixture-based tests.

Example test:

```txt
Given:
  a session with three completed dark melodic tracks
  one early skipped mainstream track
  three candidates

Expect:
  candidates related to completed tracks rank higher
  candidates related to skipped track rank lower
  explanations mention the relevant score components
```

Tests should not only check that a score exists.

They should check behavior.

---

## UI test expectations

For UI work, at minimum verify:

```txt
component renders in Demo Mode
loading state works
empty state works
error state works
keyboard interaction works when relevant
```

If adding a major panel, include screenshots or a short recording in the PR when possible.

---

## Accessibility expectations

UI contributions should consider:

```txt
keyboard navigation
focus states
contrast
screen reader labels
not relying only on color
reduced motion where relevant
```

Feedback buttons should have text labels or accessible labels.

---

## Dependency policy

Before adding a dependency, ask:

```txt
Is it necessary?
Can we implement this clearly without it?
Does it increase desktop bundle size?
Does it add native complexity?
Does it conflict with local-first goals?
```

Avoid large AI/ML dependencies in v0/v1.

Avoid dependencies that require a server for core functionality.

---

## AI coding agents

AI coding agents are allowed, but agent-generated code must follow project rules.

If using Codex, Copilot, Claude Code, Cursor, or similar tools:

```txt
read AGENTS.md first
work from small issues
avoid giant one-shot rewrites
add tests for core logic
update docs when behavior changes
review generated code carefully
```

Agent-generated code is not exempt from architecture or testing expectations.

---

## Security

Do not commit secrets.

Do not log tokens.

Do not add telemetry by default.

Do not send listening history to a remote server by default.

Do not collect user data beyond what is needed for local functionality.

If you want to add sync, telemetry, or cloud features, open a design discussion first.

---

## Spotify-specific security

Do not commit:

```txt
Spotify client secrets
Spotify access tokens
Spotify refresh tokens
private Spotify API responses
personal playlist exports
```

Use PKCE.

Use minimum scopes.

Handle 401, 403, 429, and Premium-required errors clearly.

---

## Documentation updates

Update docs when you change:

```txt
architecture
ranking logic
data model
Spotify setup
UI behavior
demo scenarios
contributor setup
```

Docs to consider:

```txt
README.md
docs/architecture.md
docs/ranking-engine.md
docs/data-model.md
docs/ui-principles.md
docs/spotify-integration.md
docs/roadmap.md
AGENTS.md
```

---

## Issue labels

Suggested labels:

```txt
good first issue
help wanted
ranking
ui
spotify-adapter
demo-mode
local-first
docs
testing
architecture
accessibility
research
blocked
```

---

## Opening an issue

A good issue includes:

```txt
problem
expected behavior
relevant docs
implementation notes
acceptance criteria
```

Example:

```md
## Problem

Skip detection currently treats all skips the same.

## Expected behavior

Very early skips should create a stronger negative signal than near-completion skips.

## Relevant docs

docs/ranking-engine.md

## Acceptance criteria

- [ ] Add skip category helper
- [ ] Add tests for very early, early, late, and near-completion skips
- [ ] Use category in skip risk scoring
- [ ] Update explanation text if needed
```

---

## Design discussions

Open a design discussion before adding:

```txt
LLM features
deep learning
new provider adapters
central servers
cloud sync
telemetry
major UI redesigns
destructive migrations
changes to public framing
commercial features
```

---

## Review checklist

Before requesting review, check:

```txt
Does this preserve the session-first thesis?
Does this keep the core provider-independent?
Does Demo Mode still work?
Are recommendation explanations grounded?
Are tests included where needed?
Are docs updated?
Are errors handled clearly?
Are secrets excluded?
```

---

## Maintainer priorities

In early versions, maintainers should prioritize:

```txt
clear architecture
working demo loop
ranking tests
polished first-run experience
Spotify adapter boundaries
good docs
contributor-friendly issues
```

Avoid expanding scope before the core loop feels good.

---

## Guiding sentence

If you contribute to Trama, help make the current session more legible.

The project is not about adding more music features.

It is about understanding what belongs next.

