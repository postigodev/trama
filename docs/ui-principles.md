# UI Principles

This document defines how Trama should look, feel, and behave.

Trama is not a music player replacement.

Trama is a companion interface for understanding and steering the current listening session.

The UI should make the session legible.

---

## Core UI thesis

Most music interfaces center the track.

Trama centers the relation between tracks.

The app should answer:

```txt
What is playing now?
What direction is the session taking?
What might come next?
Why does this recommendation belong?
How can the user steer the session?
What did the system learn from the last action?
````

The UI should not feel like a generic dashboard.

It should feel like a control panel for the living structure of a music session.

---

## Product feeling

Trama should feel:

```txt
focused
local
transparent
technical but approachable
music-aware
calm
fast
inspectable
```

Trama should not feel:

```txt
corporate
bloated
overly social
like a Spotify clone
like an AI chatbot
like a fake analytics dashboard
like a playlist farm
```

---

## Main layout

The first desktop UI should be organized around one primary screen.

Suggested layout:

```txt
┌──────────────────────────────────────────────────────────────┐
│ Trama                                      Demo / Spotify  ●  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  NOW PLAYING                                                 │
│  ┌──────────────┐   Track Title                              │
│  │ album art    │   Artist Name                              │
│  │              │   Session direction: late-night / focused  │
│  └──────────────┘   Chain health: 86%                        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  UP NEXT                                                     │
│                                                              │
│  1. Candidate Track        91   matches recent completions   │
│  2. Candidate Track        87   same playlist cluster        │
│  3. Candidate Track        82   controlled novelty           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  FEEDBACK                                                    │
│  [Fire] [More like this] [Less like this]                    │
│  [Too mainstream] [Too different] [Broke the mood]           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  SESSION CONTROLS                                            │
│  Mood strictness     ███████░░░ 70%                          │
│  Exploration         ███░░░░░░░ 30%                          │
│  Repeat tolerance    ██░░░░░░░░ 20%                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

This is a conceptual layout, not a final design.

The important point is hierarchy:

```txt
current session
  -> next candidates
  -> feedback
  -> controls
  -> explanations
```

---

## Primary views

Trama should have three main modes:

```txt
Now Mode
Lab Mode
Demo Mode
```

Optional later modes:

```txt
History Mode
Settings Mode
Provider Setup Mode
```

---

# Now Mode

Now Mode is the default experience.

It should show:

```txt
current track
current session direction
chain health
ranked next candidates
short recommendation reasons
feedback buttons
autopilot state
session controls
recent event timeline
```

Now Mode is for normal use.

It should be clean and not overloaded.

---

## Now Playing panel

The Now Playing panel should show:

```txt
album art
track title
artist
provider attribution when required
playback state
session mode
chain health
current session direction
```

Example:

```txt
Now Playing

C.R.O - Track Name
Session direction: dark / melodic / late-night
Chain health: 86%
Autopilot: On
```

The goal is not to rebuild a full player.

Avoid unnecessary playback controls unless they are required and implemented correctly.

---

## Session direction

Session direction is a lightweight summary of the current session.

Examples:

```txt
late-night / melodic / low-pressure
gym / high-energy / familiar
study / instrumental / stable
rock en español / nostalgic / medium-energy
exploratory / high-novelty
```

In v0, session direction may come from demo fixtures, tags, playlist names, or simple heuristics.

Do not pretend this is an advanced mood model unless it is actually implemented.

If uncertain, use cautious language:

```txt
Current direction
Likely direction
Session signals
```

Avoid overconfident labels.

---

## Chain health

Chain health is a UI metric that summarizes whether the session is flowing.

It should be derived from simple signals:

```txt
recent completions
recent skips
replays
positive feedback
mood break feedback
candidate rejections
```

Example:

```txt
Chain health: 82%
```

Chain health should not be treated as objective truth.

It is a legibility tool.

If used, the UI should make it feel approximate, not scientific.

---

# Up Next candidates

The Up Next section is the heart of the UI.

Each candidate card should show:

```txt
rank
track title
artist
score or confidence
primary reason
secondary reason
warnings if any
action buttons
```

Example:

```txt
#1  Track Name — Artist
Score: 91
Why: matches the last 3 completed tracks
Also: not played recently
Warning: same artist appeared earlier

[Queue next] [Less like this] [Why this?]
```

The card should answer:

```txt
Why this track next?
```

Not just:

```txt
Why this track?
```

---

## Candidate card states

Candidate cards should support states:

```txt
suggested
queued
rejected
loading
unavailable
failed_to_queue
```

Examples:

```txt
Queued by Autopilot
Rejected by user
Unavailable on active provider
Failed to queue: Premium required
```

State should be visible and honest.

---

## Recommendation explanations

Explanations should be directly connected to score components.

Good:

```txt
Matches the last 3 completed tracks.
Appears in a playlist cluster related to this session.
Not played recently.
Lower risk of breaking the current direction.
```

Bad:

```txt
Recommended by AI.
You might like this.
This song has good vibes.
Popular with similar users.
```

The UI should make explanations short by default, expandable when needed.

Suggested pattern:

```txt
Primary reason visible
"Why this?" opens full breakdown
```

---

## Score display

Scores can be useful but should not dominate the UI.

Possible displays:

```txt
91
91%
Strong fit
High session fit
```

For normal users, “High session fit” may be better than a raw score.

For Lab Mode, show exact scores and breakdowns.

Recommended approach:

```txt
Now Mode: qualitative score + one numeric value if useful
Lab Mode: full numeric breakdown
```

---

# Feedback controls

Feedback is how the user steers the session.

Initial feedback buttons:

```txt
Fire
More like this
Less like this
Too mainstream
Too safe
Too different
Broke the mood
Keep mood
Surprise me
```

Not all buttons need to be visible at once.

Recommended visible set:

```txt
Fire
More like this
Less like this
Broke the mood
```

In early personal mode builds, this visible set can live directly in the Liam
panel as long as it writes real feedback events, updates session controls, and
shows an immediate consequence message.

Secondary menu:

```txt
Too mainstream
Too safe
Too different
Keep mood
Surprise me
```

Feedback should feel fast.

One click should create a visible event and update ranking.

---

## Feedback result visibility

After feedback, the UI should show what changed.

Example:

```txt
Marked "Too mainstream".
Mainstream tolerance lowered for this session.
Ranking updated.
```

Or:

```txt
Marked "Broke the mood".
Similar transitions will be penalized.
Mood strictness increased.
```

The user should feel that feedback has consequences.

In Lab Mode, a short result message is enough at first if it clearly names the
feedback, the affected track, and the control or session direction that changed.

---

# Session controls

Session controls let the user steer ranking behavior.

Initial controls:

```txt
Mood strictness
Exploration
Repeat tolerance
Mainstream tolerance
Autopilot
```

These controls should be simple and legible.

The first visible control can be a single Autopilot toggle plus compact readouts
for mood strictness, exploration, repeat tolerance, and mainstream tolerance.

Avoid exposing too many algorithm weights in normal mode.

---

## Mood strictness

Meaning:

```txt
How strongly should Trama protect the current direction?
```

Low:

```txt
Allow broader transitions.
```

High:

```txt
Stay close to the current session.
```

---

## Exploration

Meaning:

```txt
How much novelty should Trama allow?
```

Low:

```txt
Prefer safe next tracks.
```

High:

```txt
Allow more surprising but related tracks.
```

---

## Repeat tolerance

Meaning:

```txt
How okay is it to repeat artists or familiar tracks?
```

Low:

```txt
Avoid recent repeats.
```

High:

```txt
Allow familiar loops.
```

---

## Mainstream tolerance

Meaning:

```txt
How okay is it to recommend obvious or popular tracks?
```

Low:

```txt
Prefer deeper cuts when possible.
```

High:

```txt
Allow high-confidence popular tracks.
```

---

# Autopilot

Autopilot should feel powerful but controlled.

Autopilot states:

```txt
Off
Ready
Watching current track
Candidate selected
Queued next track
Paused due to error
```

Autopilot should show what it is doing.

Example:

```txt
Autopilot is watching this track.
Next queue decision after 75% progress.
```

Or:

```txt
Autopilot queued Track Name because it matched recent completions.
```

Autopilot should never silently make unexplained choices.

---

## Autopilot safety

Autopilot should avoid:

```txt
queueing duplicates
overwriting user intent
queueing too many tracks
continuing after provider errors
continuing after repeated user rejection
```

Autopilot should stop or ask for user input after repeated failures.

---

# Event timeline

A compact event timeline helps make the session legible.

Example:

```txt
10:42 completed Track A
10:46 completed Track B
10:48 skipped Track C at 18%
10:49 marked "Too mainstream"
10:50 Trama lowered mainstream tolerance
10:51 queued Track D
```

The timeline should be visible but not overwhelming.

It can be collapsed by default.

---

# Lab Mode

Lab Mode is for contributors, power users, and debugging.

It should expose:

```txt
raw candidate pool
score breakdowns
feature values
active session controls
recent events
feedback effects
filtering decisions
ranking diagnostics
provider state
```

Lab Mode should make the engine inspectable.

Example candidate breakdown:

```txt
Track Name — Artist

Total score: 0.83

+0.22 session similarity
+0.14 playlist affinity
+0.11 completion affinity
+0.08 novelty
-0.04 recent repeat risk
-0.02 skip risk

Reasons:
- matches last 3 completed tracks
- appears in related playlist cluster
- not played recently
```

Lab Mode should be useful for writing tests and improving ranking logic.

---

# Demo Mode

Demo Mode is a first-class UI mode.

It should let users and contributors experience Trama without provider setup.

Demo Mode should include scenario selection:

```txt
Late-night melodic session
Gym session
Study session
Rock en español session
Party session
Broken session with many skips
High exploration session
Keep mood session
```

Each scenario should include:

```txt
current track
recent event history
candidate pool
feedback examples
ranking output
session controls
```

Demo Mode should use the real core engine.

Do not fake recommendation cards manually.

---

## Demo Mode onboarding

When the app opens without a provider connection, show Demo Mode first.

Example:

```txt
Try Trama without connecting anything.

Explore a simulated listening session and see how the ranking engine reacts to skips, completions, and feedback.
```

Actions:

```txt
Start demo
Connect Spotify
Read architecture
Open Lab Mode
```

This makes the project easier to understand.

---

# Provider setup UI

Provider setup should be honest and developer-friendly.

For Spotify, the UI should explain:

```txt
you need your own Spotify Developer app
you need a client ID
you need a redirect URI
some features may require Premium
Trama is not affiliated with Spotify
```

The setup should avoid implying that Trama provides official Spotify functionality.

---

# Empty states

Empty states should teach the product.

Examples:

## No active session

```txt
No active session yet.

Start playing music or launch a demo scenario.
Trama will begin tracking the session once a current track is available.
```

## No candidates

```txt
No candidates yet.

Import playlists, use Demo Mode, or wait for more session history.
```

## No provider

```txt
No provider connected.

You can still use Demo Mode or configure a provider adapter.
```

## No explanations

```txt
No explanation available.

This usually means the candidate was not scored by the core engine.
```

The last empty state should rarely happen.

---

# Visual identity

Trama’s visual identity should reflect structure, relation, and flow.

Possible motifs:

```txt
threads
nodes
lines
session paths
subtle graph structures
timeline marks
signal pulses
```

Avoid:

```txt
Spotify-like green branding
generic AI gradients
overused chatbot visuals
music note clichés everywhere
overly corporate SaaS dashboards
```

The design can be minimal and dark-first, but should not depend on darkness.

---

## Color

Avoid colors that make the app look like a Spotify clone.

Do not rely on Spotify green as a primary brand color.

Possible directions:

```txt
warm off-white + charcoal
deep blue/black + muted amber
soft graphite + violet accent
dark slate + copper
```

The exact palette can be decided later.

The important thing is that Trama feels independent.

---

## Typography

Typography should feel technical and readable.

Suggested direction:

```txt
clean sans-serif for UI
monospace only for Lab Mode / diagnostics
large track titles
small but readable explanation text
```

Avoid making everything look like a terminal.

Trama is technical, but it is still a music experience.

---

## Motion

Motion should clarify state changes.

Good motion:

```txt
candidate promoted after feedback
score changes subtly
event added to timeline
Autopilot status changes
panel expands for explanation
```

Bad motion:

```txt
constant animations
fake loading drama
visual noise during playback
animations that hide state
```

Motion should make the session feel alive, not distract from it.

---

# Accessibility

The UI should support:

```txt
keyboard navigation
clear focus states
readable contrast
text alternatives for album art
non-color-only status indicators
reduced motion mode
screen-reader-friendly labels
```

Feedback buttons should be understandable without icons alone.

---

# Responsiveness

The first target is desktop.

But the layout should handle:

```txt
small laptop windows
wide desktop windows
collapsed side panels
resizable app window
```

The main experience should still work in a narrow layout.

Suggested responsive behavior:

```txt
wide: Now Playing + Candidates side by side
medium: stacked panels
narrow: tabbed sections
```

---

# Copywriting tone

The UI should be clear, not mystical.

Good copy:

```txt
Matches recent completions.
Skipped similar tracks earlier.
Queued by Autopilot.
Lowered mainstream tolerance.
```

Bad copy:

```txt
The AI has sensed your vibe.
Magically discovering your soul.
Your musical destiny awaits.
```

The product can have personality without becoming vague.

---

# First release UI scope

The first polished release should include:

```txt
Now Playing panel
Up Next candidates
short explanations
feedback buttons
session controls
event timeline
Autopilot toggle
Demo Mode
Lab Mode
Provider setup screen
Settings screen
```

Avoid in first release:

```txt
social features
accounts
cloud sync
profile pages
complex playlist editors
multi-user sessions
chatbot UI
deep analytics dashboards
```

---

# UI implementation principles

UI code should follow the architecture.

Prefer:

```txt
feature-based organization
small reusable components
typed props
clear loading/error states
components that work in demo and provider mode
```

Avoid:

```txt
ranking logic inside components
provider API calls inside presentational components
hardcoded demo-only UI paths
global state for everything
untyped event payloads
```

Components should render engine state, not invent it.

---

# Suggested component list

Initial components:

```txt
AppShell
ProviderStatusBadge
NowPlayingCard
SessionDirectionBadge
ChainHealthMeter
CandidateList
CandidateCard
RecommendationReasonList
ScoreBadge
FeedbackBar
SessionControlsPanel
AutopilotPanel
EventTimeline
LabModePanel
ScoreBreakdownTable
DemoScenarioPicker
ProviderSetupCard
EmptyState
ErrorCallout
```

---

# Success criteria

The UI succeeds if a user can understand within one minute:

```txt
what Trama is doing
what the current session is
why a candidate was recommended
how to steer the recommendations
whether Autopilot is active
what changed after feedback
```

The UI fails if it looks polished but hides the engine.

---

# Guiding sentence

The UI should make the session visible.

Do not build a prettier music player.
Build a clearer queue brain.
