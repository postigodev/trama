# Ranking Engine

This document defines the first version of Trama’s ranking engine.

The ranking engine answers one question:

> Given the current session, which track belongs next?

The first engine should be deterministic, local-first, explainable, and testable.

No LLMs are required for the core ranking loop.  
No deep learning is required for v0/v1.  
No provider-specific API objects should enter the engine.

---

## Core idea

Trama does not rank tracks only by whether the user might like them in general.

It ranks tracks by whether they fit the current listening session.

A candidate should score highly when it:

```txt
continues the current direction
matches recent completed tracks
avoids recently skipped patterns
respects explicit feedback
adds enough novelty without breaking the session
has not been overplayed recently
can be explained clearly
````

A candidate should score poorly when it:

```txt
was recently skipped
was played too recently
matches a rejected direction
breaks the session’s current structure
is too obvious when exploration is high
is too risky when mood strictness is high
cannot be justified by available signals
```

---

## Inputs

The ranking engine should receive normalized Trama models.

Example:

```ts
type QueueEngineInput = {
  currentTrack: Track | null;
  session: SessionState;
  candidates: CandidateTrack[];
  recentEvents: PlayEvent[];
  feedback: FeedbackEvent[];
  config: RankingConfig;
};
```

The engine should not fetch data by itself.

It should not call provider APIs.

It should not read or write directly to the database.

It should only transform input into ranked output.

---

## Outputs

The engine should return ranked candidates with explanations.

Example:

```ts
type QueueEngineOutput = {
  rankedCandidates: RankedCandidate[];
  diagnostics: EngineDiagnostics;
};
```

A ranked candidate should include:

```ts
type RankedCandidate = {
  track: Track;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: RecommendationReason[];
  warnings: RecommendationWarning[];
};
```

The score is useful for ordering.

The explanation is useful for trust, debugging, and contribution.

A candidate without reasons is incomplete.

---

## Ranking pipeline

The ranking pipeline should be explicit and easy to test.

```txt
candidate pool
  -> normalize candidates
  -> filter invalid candidates
  -> compute features
  -> apply rewards
  -> apply penalties
  -> compute final score
  -> generate explanations
  -> sort candidates
  -> return diagnostics
```

Do not collapse candidate generation and ranking into the same function.

Candidate generation asks:

```txt
What tracks are possible?
```

Ranking asks:

```txt
Which possible track belongs next?
```

---

## Ranking configuration

The first ranking engine should expose a small configuration object.

Example:

```ts
type RankingConfig = {
  moodStrictness: number;      // 0.0 - 1.0
  exploration: number;         // 0.0 - 1.0
  repeatTolerance: number;     // 0.0 - 1.0
  mainstreamTolerance: number; // 0.0 - 1.0
  feedbackWeight: number;      // 0.0 - 1.0
};
```

Recommended defaults:

```ts
const defaultRankingConfig: RankingConfig = {
  moodStrictness: 0.7,
  exploration: 0.25,
  repeatTolerance: 0.25,
  mainstreamTolerance: 0.5,
  feedbackWeight: 0.8,
};
```

Configuration should be simple enough for users to understand.

Avoid exposing too many knobs in v0.

---

## Event types

The engine should reason from events.

Important play events:

```txt
track_started
track_completed
track_skipped
track_replayed
track_paused
track_resumed
candidate_queued
candidate_rejected
session_started
session_reset
```

Important feedback events:

```txt
more_like_this
less_like_this
fire
too_mainstream
too_safe
too_different
broke_the_mood
keep_mood
surprise_me
```

Each event should have enough context to be useful:

```ts
type PlayEvent = {
  id: string;
  sessionId: string;
  trackId: string;
  type: PlayEventType;
  occurredAt: string;
  progressMs?: number;
  durationMs?: number;
  source?: EventSource;
};
```

Feedback:

```ts
type FeedbackEvent = {
  id: string;
  sessionId: string;
  trackId?: string;
  candidateTrackId?: string;
  type: FeedbackType;
  occurredAt: string;
  weight?: number;
};
```

---

## Skip detection

Skip detection is an inferred event.

A simple v0 rule:

```txt
if track changed before 35% completion:
  track_skipped
```

Example:

```ts
function detectSkip(progressMs: number, durationMs: number): boolean {
  if (durationMs <= 0) return false;
  return progressMs / durationMs < 0.35;
}
```

But not all skips are equal.

Suggested categories:

```txt
very_early_skip: under 15%
early_skip: under 35%
late_skip: 35% - 70%
near_completion_skip: over 70%
```

Penalty strength should vary:

```txt
very_early_skip -> strong negative signal
early_skip -> negative signal
late_skip -> weak negative signal
near_completion_skip -> usually not a strong negative signal
```

The engine should avoid treating every skip as equal.

---

## Completion detection

Completion is also inferred.

A simple v0 rule:

```txt
if track reached at least 80% duration:
  track_completed
```

Example:

```ts
function detectCompletion(progressMs: number, durationMs: number): boolean {
  if (durationMs <= 0) return false;
  return progressMs / durationMs >= 0.8;
}
```

Completion is a positive signal, but it should not be overinterpreted.

A completed track means:

```txt
this direction probably worked
```

It does not always mean:

```txt
the user loves this track
```

---

## Replay detection

Replay is a strong positive signal.

Suggested v0 rule:

```txt
if same track starts again within a short window:
  track_replayed
```

Replay can indicate:

```txt
strong affinity
session intensification
track-specific attachment
mood reinforcement
```

Replay should usually create a stronger reward than normal completion.

---

## Candidate features

The first ranking engine should compute simple, inspectable features.

Suggested features:

```txt
session_similarity
artist_affinity
playlist_affinity
completion_affinity
skip_risk
recent_repeat_risk
explicit_feedback_score
novelty_score
mainstream_score
mood_break_risk
```

Each feature should be independently testable.

---

## Feature: session_similarity

`session_similarity` measures how well a candidate fits the recent accepted direction of the session.

In v0, this can be approximated through simple overlap signals:

```txt
same artist as recent completed tracks
artist appears in same playlist cluster
candidate appears near completed tracks in imported playlists
candidate shares tags with accepted tracks
candidate was previously completed in similar session mode
```

This does not need embeddings in v0.

Example explanation:

```txt
matches the recent accepted direction of this session
```

---

## Feature: artist_affinity

`artist_affinity` measures whether the candidate’s artist is connected to the current session.

Positive signals:

```txt
same artist as current track
artist appeared in recently completed tracks
artist appears often in user playlists
artist was manually marked "more like this"
```

Negative signals:

```txt
artist was skipped repeatedly in this session
artist was marked "less like this"
artist appears in a rejected candidate cluster
```

Artist affinity should not dominate the score by itself.

Otherwise the queue becomes repetitive.

---

## Feature: playlist_affinity

`playlist_affinity` uses user playlists as a local relation graph.

A simple model:

```txt
tracks that appear together in playlists are weakly related
tracks that appear near each other in playlists are more related
tracks that appear in multiple same playlists are more related
```

Example:

```txt
Track A and Track B appear in 3 of the same playlists.
Track C appears next to Track A in a playlist.
Track D appears in a playlist that has many completed tracks from this session.
```

This is useful because playlists are user-curated or socially-curated structures.

They can encode relations that pure metadata misses.

---

## Feature: completion_affinity

`completion_affinity` rewards candidates related to tracks completed in the current session.

Accepted tracks should shape the direction.

Example:

```txt
last 3 completed tracks:
  Track A
  Track B
  Track C

Candidate X shares artist/playlist/tag relations with A, B, or C.
```

Candidate X receives a reward.

The reward should decay over time so that old session events do not dominate forever.

---

## Feature: skip_risk

`skip_risk` penalizes candidates related to recent skipped tracks.

This should be strongest for very early skips.

Example:

```txt
User skipped Track A at 12%.
Candidate X shares artist or playlist cluster with Track A.
Candidate X receives a skip-risk penalty.
```

The engine should treat skips as boundaries.

A skip does not only reject a track.
It may reject a direction.

---

## Feature: recent_repeat_risk

`recent_repeat_risk` prevents boring recommendations.

A candidate should be penalized if:

```txt
it was played recently
it was queued recently
it was skipped recently
the same artist has appeared too many times recently
```

Repeat tolerance should be configurable.

Low repeat tolerance:

```txt
strong penalty for repeated artists/tracks
```

High repeat tolerance:

```txt
lighter penalty for repeated artists/tracks
```

---

## Feature: explicit_feedback_score

Explicit feedback should be one of the strongest signals.

Examples:

```txt
fire -> strong positive
more_like_this -> positive
less_like_this -> negative
broke_the_mood -> strong negative for similar transitions
too_mainstream -> reduce mainstream/popularity-heavy candidates
too_safe -> increase exploration
too_different -> increase mood strictness
keep_mood -> reduce exploration temporarily
surprise_me -> increase exploration temporarily
```

Feedback should affect both:

```txt
the specific track
related candidates
session configuration
```

Example:

```txt
User presses "too mainstream" on a candidate.

Effects:
- penalize that candidate
- reduce mainstream tolerance for the current session
- increase novelty pressure
```

---

## Feature: novelty_score

`novelty_score` rewards candidates that are not too obvious.

Novelty should be controlled by the `exploration` setting.

Low exploration:

```txt
prefer safer session-continuing tracks
```

High exploration:

```txt
allow less familiar but related tracks
```

Novelty should not mean random.

A good novelty candidate should be:

```txt
new enough to be interesting
related enough not to break the session
```

---

## Feature: mainstream_score

`mainstream_score` should not be treated as always good or always bad.

Some sessions need obvious/high-confidence tracks.
Some sessions need deeper cuts.

The ranking engine should allow a mainstream tolerance setting.

Potential signals:

```txt
provider popularity score if available
track appears in many playlists
artist appears very frequently in library
candidate is already played often
```

A candidate can receive:

```txt
mainstream reward
```

or:

```txt
mainstream penalty
```

depending on session configuration and feedback.

---

## Feature: mood_break_risk

`mood_break_risk` estimates whether a candidate is likely to disrupt the session.

In v0, this can be approximated through:

```txt
low relation to recent completed tracks
high relation to recent skipped tracks
large jump in known tags
artist/playlist cluster mismatch
explicit "broke_the_mood" feedback on similar tracks
```

Mood break risk should be weighted by `moodStrictness`.

High mood strictness:

```txt
strong penalty for risky transitions
```

Low mood strictness:

```txt
allow broader transitions
```

---

## Score formula v0

The initial formula should be simple.

Example:

```txt
score =
  0.25 * session_similarity
+ 0.15 * artist_affinity
+ 0.15 * playlist_affinity
+ 0.15 * completion_affinity
+ 0.20 * explicit_feedback_score
+ 0.10 * novelty_score
- 0.25 * skip_risk
- 0.20 * recent_repeat_risk
- 0.25 * mood_break_risk
```

This formula is not final.

It should be treated as a baseline.

All weights should be easy to inspect and tune.

---

## Score breakdown

Every candidate should include a breakdown.

Example:

```ts
type ScoreBreakdown = {
  total: number;
  components: {
    sessionSimilarity: number;
    artistAffinity: number;
    playlistAffinity: number;
    completionAffinity: number;
    explicitFeedback: number;
    novelty: number;
    skipRisk: number;
    recentRepeatRisk: number;
    moodBreakRisk: number;
  };
};
```

The explanation layer should be generated from this breakdown.

Do not generate explanations separately from scoring logic.

Explanations should be grounded in actual score components.

---

## Recommendation explanations

Explanations should be short, concrete, and connected to score components.

Good explanations:

```txt
matches the last 3 completed tracks
related to a playlist cluster that worked in this session
avoids artists skipped earlier
adds novelty without leaving the current direction
not played recently
```

Bad explanations:

```txt
recommended by AI
you may like this
because it is similar
good vibes
popular with listeners
```

The explanation should answer:

```txt
Why this track next?
```

Not merely:

```txt
Why this track ever?
```

---

## Warnings

Some candidates may rank highly but still carry warnings.

Example warnings:

```txt
same artist appeared recently
higher risk of breaking mood
played recently
less connected to current session
high novelty candidate
```

Warnings are useful for UI and Lab Mode.

They help users understand tradeoffs.

---

## Filtering

Before scoring, the engine should filter invalid candidates.

Possible filters:

```txt
current track
tracks already in the immediate queue
tracks played too recently if repeat tolerance is low
tracks explicitly rejected in this session
tracks missing required provider URI
tracks unavailable on the active provider
```

Filtering should be conservative.

Do not filter aggressively when a penalty would be more informative.

Example:

```txt
recently played track -> usually penalize
explicitly rejected track -> usually filter
```

---

## Session controls

Session controls should affect scoring.

### Mood strictness

Controls how strongly the engine protects the current direction.

High mood strictness:

```txt
increase mood_break_risk penalty
increase session_similarity reward
decrease broad exploration
```

Low mood strictness:

```txt
allow wider candidate range
reduce mood-break penalty
```

### Exploration

Controls how much novelty is allowed.

High exploration:

```txt
increase novelty reward
reduce safe-track preference
allow more distant candidates
```

Low exploration:

```txt
favor safe transitions
prefer high session similarity
```

### Repeat tolerance

Controls repeated tracks/artists.

High repeat tolerance:

```txt
allow repeated artists and familiar tracks
```

Low repeat tolerance:

```txt
penalize recently played tracks and artists
```

### Mainstream tolerance

Controls how much obvious/popular music is acceptable.

High mainstream tolerance:

```txt
allow popular/high-confidence candidates
```

Low mainstream tolerance:

```txt
favor deeper cuts when possible
```

---

## Feedback effects

Feedback should have immediate session effects.

Example mapping:

```txt
fire:
  increase affinity for track and related candidates

more_like_this:
  increase session similarity weight for related candidates

less_like_this:
  penalize track and related candidates

broke_the_mood:
  increase mood strictness
  penalize similar transitions

too_mainstream:
  decrease mainstream tolerance
  increase novelty pressure

too_safe:
  increase exploration

too_different:
  decrease exploration
  increase mood strictness

keep_mood:
  temporarily increase mood strictness

surprise_me:
  temporarily increase exploration
```

Feedback effects should be recorded as events.

They should not be hidden mutations.

---

## Candidate generation v0

Candidate generation is outside the ranking engine, but the ranking engine depends on candidate quality.

Good v0 candidate sources:

```txt
tracks from user playlists
tracks from liked/library tracks
tracks by current artist
tracks by artists already accepted in session
tracks from playlists containing recent completed tracks
demo candidate pools
```

Avoid requiring unavailable recommendation endpoints.

Avoid requiring audio analysis or audio features in v0.

---

## Candidate pool size

Initial target:

```txt
minimum useful pool: 20 tracks
good local pool: 50-300 tracks
upper v0 target: 500 tracks
```

The engine should handle 500 candidates quickly on a normal laptop.

Ranking should usually complete in under 100ms for v0 candidate pools.

---

## Determinism

The default ranking engine should be deterministic.

Given the same input, it should return the same output.

This matters for:

```txt
tests
debugging
Lab Mode
contributor trust
score comparison
```

If randomness is used for exploration, it should be controlled by a seed.

---

## Diagnostics

The engine should return diagnostics in development mode.

Example:

```ts
type EngineDiagnostics = {
  candidateCount: number;
  filteredCount: number;
  rankedCount: number;
  rankingDurationMs: number;
  activeConfig: RankingConfig;
  topFeatureContributors: string[];
};
```

Diagnostics should support Lab Mode and debugging.

---

## Lab Mode

Lab Mode should expose the ranking engine’s internals.

For each candidate:

```txt
final score
score breakdown
positive reasons
warnings
penalties
raw feature values
rank position
```

For the session:

```txt
current track
recent completed tracks
recent skipped tracks
active feedback
current config
candidate pool source
```

Lab Mode is for contributors and power users.

It should not be required for normal use.

---

## Evaluation

Trama should eventually include an evaluation harness.

Initial evaluation can use demo fixtures.

Example evaluation questions:

```txt
Did skipped directions receive lower scores?
Did completed directions receive higher scores?
Did "too mainstream" lower obvious candidates?
Did "keep mood" reduce risky transitions?
Did recently played tracks receive penalties?
Did explanations match score breakdowns?
```

A simple fixture-based test can be more useful than premature ML metrics.

---

## Testing requirements

Core tests should cover:

```txt
scoreCandidate returns deterministic scores
skip risk increases after early skip
completion affinity increases after completed track
recent repeat penalty applies correctly
explicit feedback changes ranking
mood strictness changes mood break penalty
exploration changes novelty reward
explanations are generated from score components
filtered candidates do not appear in output
diagnostics report candidate counts
```

Regression tests should be added whenever ranking behavior changes.

---

## Future learning

Trama may eventually support lightweight local learning.

Preferred direction:

```txt
adaptive weights
local contextual bandit
session-specific preference updates
offline evaluation
user-controlled model reset
```

A contextual bandit framing:

```txt
context = current session state
action = selected next track
reward = completion / skip / replay / feedback
```

Possible reward function:

```txt
very early skip: -2.0
early skip: -1.0
completion: +1.0
manual fire: +3.0
replay: +4.0
broke_the_mood: -3.0
```

Any learning layer must remain:

```txt
local-first
inspectable
resettable
explainable enough for users
independent from provider-specific objects
```

---

## What not to do

Do not do this in v0/v1:

```txt
use an LLM to decide the next track
hide ranking behind "AI magic"
train a model on provider content
make Spotify-specific fields required in core
rank directly inside React components
mix provider calls with scoring logic
generate explanations unrelated to score components
optimize only for generic similarity
ignore skip/refusal signals
```

---

## Guiding implementation shape

A clean first implementation could look like:

```ts
export function rankCandidates(input: QueueEngineInput): QueueEngineOutput {
  const validCandidates = filterCandidates(input.candidates, input);

  const rankedCandidates = validCandidates
    .map((candidate) => {
      const features = computeCandidateFeatures(candidate, input);
      const scoreBreakdown = computeScoreBreakdown(features, input.config);
      const reasons = buildRecommendationReasons(scoreBreakdown, features);
      const warnings = buildRecommendationWarnings(scoreBreakdown, features);

      return {
        track: candidate.track,
        score: scoreBreakdown.total,
        scoreBreakdown,
        reasons,
        warnings,
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    rankedCandidates,
    diagnostics: buildDiagnostics(input, validCandidates, rankedCandidates),
  };
}
```

This shape should remain visible even as the engine becomes more sophisticated.

---

## Guiding sentence

The ranking engine should always optimize for this:

> Not the best track in general. The track that belongs next.
