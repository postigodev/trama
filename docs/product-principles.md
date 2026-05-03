# Product Principles

This document defines the product principles for Trama.

These principles should guide design, engineering, ranking logic, UI decisions, documentation, and agent-generated code.

When in doubt, preserve the thesis:

> Trama ranks what belongs next in the current listening session.

---

## 1. The session comes first

Trama is not primarily a library manager, playlist generator, music player, or analytics dashboard.

Trama is a session-aware queue engine.

The central object is the listening session:

```txt
current track
  + recent completions
  + recent skips
  + explicit feedback
  + candidate pool
  + session controls
  = next recommendation
````

Every feature should make the current session easier to understand, continue, or adjust.

If a feature does not help with session continuity, it should be questioned.

---

## 2. A good song is not always a good next song

Trama should distinguish between:

```txt
good song
good recommendation
good next track
```

A track can match the user’s long-term taste and still be wrong for the current session.

The ranking engine should prioritize contextual fit over generic similarity.

The UI should help users understand this distinction.

---

## 3. The user remains in control

Trama should assist the queue, not take ownership away from the user.

The user should be able to:

```txt
turn Autopilot on/off
choose a candidate manually
give explicit feedback
inspect recommendation reasons
adjust exploration
adjust mood strictness
clear or reset a session
disable provider integrations
```

Automation should always be legible and reversible.

---

## 4. Explanations are a product feature

Recommendation explanations are not optional polish.

They are part of the product.

Every ranked candidate should be able to expose reasons such as:

```txt
matches recently completed tracks
similar to this session’s seed track
appears in a related playlist cluster
avoids artists skipped earlier
has not been played recently
adds controlled novelty
may break the mood
```

If the system cannot explain a recommendation, the ranking logic is not ready.

---

## 5. No black-box magic in v0/v1

Trama should avoid vague “AI-powered” claims.

The first versions should use transparent logic:

```txt
weighted scoring
clear penalties
clear rewards
visible session state
deterministic tests
explainable output
```

LLMs should not be used in the core ranking loop.

Deep learning should not be required for v0/v1.

Future learning systems may be explored only if they preserve local-first behavior, explainability, and user control.

---

## 6. Local-first by default

Trama should store core user data locally by default:

```txt
sessions
play events
feedback events
ranking state
demo data
provider tokens when appropriate
```

A central server should not be required for the core product experience.

Local-first behavior supports:

```txt
privacy
user control
debuggability
offline development
low infrastructure cost
open-source contribution
```

Provider APIs may require network access, but the recommendation engine itself should not require a remote service.

---

## 7. Provider adapters are replaceable

Spotify may be the first adapter, but Trama is not a Spotify project.

The core engine should not import Spotify-specific types directly.

The provider layer should translate external platform data into Trama’s internal models.

Preferred boundary:

```txt
Provider API data
  -> provider adapter
  -> normalized Trama models
  -> core engine
  -> ranked candidates
  -> provider action
```

Avoid this:

```txt
Spotify response object
  -> ranking engine
```

Provider-specific logic belongs in provider packages, not in `packages/core`.

---

## 8. Trama is a companion, not a replacement player

The UI should feel like a control layer for the session, not a clone of a streaming app.

Trama should not try to reproduce the full music player experience.

The core views should focus on:

```txt
Now Playing
Session State
Up Next Candidates
Recommendation Reasons
Feedback
Autopilot
Lab Mode
Demo Mode
```

The app should respect provider branding rules and should not imply affiliation with any streaming platform.

---

## 9. Demo mode is a first-class feature

Trama should be usable without connecting a real music account.

Demo mode should support:

```txt
mock tracks
mock artists
mock playlists
mock sessions
simulated skips
simulated completions
simulated feedback
candidate ranking
recommendation explanations
UI testing
```

This is important because:

```txt
not all contributors have Spotify Premium
not all contributors want to set up API keys
ranking logic should be testable without external services
UI work should not depend on provider availability
```

A contributor should be able to clone the repo and understand the project quickly.

---

## 10. The system should learn from refusal

Skips, dislikes, and “broke the mood” feedback are not just negative events.

They define boundaries.

Trama should treat refusal as useful information.

Examples:

```txt
early skip -> strong negative session signal
late skip -> weaker negative signal
"less like this" -> reduce local affinity
"too mainstream" -> increase novelty pressure
"broke the mood" -> penalize similar transitions
```

The system should not only learn what the user likes.
It should learn what the session rejects.

---

## 11. Avoid overfitting to the user’s average self

Trama should not reduce the user to their historical average.

Long-term taste matters, but it should not dominate every session.

A user may have multiple listening modes:

```txt
late-night
gym
study
party
melancholic
nostalgic
focused
social
exploratory
```

The ranking engine should allow the current session to temporarily override the long-term profile.

---

## 12. Build for inspection and debugging

Trama should make internal state visible during development.

The project should include a Lab Mode or equivalent debugging surface that can show:

```txt
current session state
candidate pool
feature values
score breakdown
ranking reasons
recent events
active penalties
active rewards
provider status
```

This helps users trust the system and helps contributors improve it.

---

## 13. Keep the first release narrow but complete

A strong v0 is better than a broad, shallow app.

The first public release should demonstrate the full loop:

```txt
observe or simulate session
generate candidates
rank candidates
explain recommendations
collect feedback
update session state
```

Avoid adding unrelated features before that loop feels coherent.

Features to avoid in v0:

```txt
social feeds
accounts
cloud sync
LLM chat
complex dashboards
multi-user collaboration
advanced music analytics
monetization
```

---

## 14. Do not confuse polish with scope creep

The first release should feel polished.

But polish should support the core loop.

Good polish:

```txt
clear empty states
strong demo mode
beautiful recommendation cards
fast feedback buttons
visible score explanations
smooth session timeline
simple onboarding
good documentation
```

Bad polish:

```txt
unrelated visual effects
fake AI claims
complex onboarding
too many settings
music platform clone UI
features that hide the engine
```

---

## 15. Contributions should strengthen the engine

Trama should be easy to contribute to, but contribution quality matters.

Preferred contributions:

```txt
better ranking features
better test fixtures
clearer explanations
new provider adapters
improved local persistence
better UI for session state
more robust skip detection
documentation improvements
evaluation harnesses
```

Discouraged contributions:

```txt
opaque recommendation logic
hardcoded platform assumptions
unexplained model outputs
centralized data collection by default
provider branding misuse
features that bypass user control
```

---

## 16. The project should be honest about constraints

Trama should not pretend platform APIs are unlimited.

Documentation should clearly explain:

```txt
what a provider adapter can access
what it cannot access
what requires user setup
what requires premium accounts
what may fail due to API restrictions
what is simulated in demo mode
```

This honesty improves trust and reduces contributor confusion.

---

## 17. Do not frame Trama as cloning another platform

Trama may be inspired by the broader idea of session-aware recommendation.

But public documentation should not describe the project as copying or cloning another company’s recommender.

Use this framing:

```txt
session-first queue ranking
adaptive music sessions
transparent recommendation logic
local-first queue assistant
```

Avoid this framing:

```txt
clone X algorithm
better version of Y
replacement for Z recommender
```

The project should stand on its own thesis.

---

## 18. Default to small, testable units

Core logic should be implemented in small units that are easy to test.

Examples:

```txt
detectSkip(event)
detectCompletion(event)
scoreCandidate(candidate, session)
applyRecentRepeatPenalty(candidate, session)
buildRecommendationExplanation(scoreBreakdown)
updateSessionState(event)
```

Avoid large, tangled functions that mix:

```txt
provider calls
database writes
ranking logic
UI state
side effects
```

The recommendation engine should be testable without running the desktop app.

---

## 19. The UI should make the session legible

The user should be able to understand the current session at a glance.

Important UI concepts:

```txt
current track
session direction
chain health
recent events
next candidates
feedback buttons
autopilot state
score explanations
```

The interface should answer:

```txt
What is playing?
Why is this the next suggestion?
What did Trama learn from my last action?
How do I steer the session?
```

---

## 20. Guiding product question

For every feature, ask:

> Does this help the next track belong more clearly to the current session?

If the answer is no, the feature probably does not belong in v0/v1.
