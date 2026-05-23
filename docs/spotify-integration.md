# Spotify Integration

This document defines how Trama should integrate with Spotify.

The Spotify adapter is a provider adapter.

It is not the core of Trama.

```txt
Trama core engine != Spotify adapter
````

Spotify can provide library/playlist context, metadata enrichment, and queue or
playback control actions. Trama should prefer local OS media session APIs for
basic observation when they are available.

---

## Purpose of the Spotify adapter

The Spotify adapter should let a user connect their Spotify account and use
Trama as a local companion/controller layer for their current listening session.

The adapter may support:

```txt
OAuth PKCE authentication
current playback observation
recently played import
user playlist import
saved/library track import when available
search-based candidate discovery
queue insertion
pause/resume/skip control
device awareness
provider error handling
```

The adapter should not own:

```txt
ranking logic
session modeling
score explanations
feedback interpretation
local-first persistence strategy
UI product thesis
```

Provider data should be normalized before entering the core engine.

---

## Important disclaimer

This document is an engineering guide, not legal advice.

Spotify APIs, quota rules, and developer policies can change.

Before shipping a public release, check the latest Spotify Developer documentation, Developer Policy, Branding Guidelines, and quota requirements.

As of the current docs, Spotify states that developer apps must follow its policy, including restrictions around misleading use, branding, core-experience replication, ML/AI training, quotas, and commercial streaming use. Spotify also says apps in development mode require the app owner to have Spotify Premium and are limited to up to 5 authenticated users who must be allowlisted. ([Spotify para Desarrolladores][1])

---

## Product framing

Use this framing:

```txt
Trama is a local-first adaptive queue engine for music sessions.

The Spotify adapter lets Trama observe playback state and apply queue actions for users who connect their own Spotify account.
```

Avoid this framing:

```txt
Spotify replacement
better Spotify algorithm
Spotify Radio clone
Spotify recommender clone
AI trained on Spotify data
commercial Spotify streaming app
```

Spotify’s Developer Policy says apps should not mimic, replicate, or attempt to replace a core Spotify user experience without prior written permission, and that the app should add independent value or functionality that improves users’ interactions with Spotify. ([Spotify para Desarrolladores][1])

Trama’s independent value should be:

```txt
local-first session tracking
transparent recommendation explanations
user-controlled feedback
provider-independent ranking engine
demo mode
open-source experimentation
```

---

## Naming and branding

Do not name the app in a way that sounds affiliated with Spotify.

Avoid names such as:

```txt
SpotQueue
SpotifyNext
Nexotify
SpotTrama
Spotify Autopilot
```

Use:

```txt
Trama
```

Spotify’s policy says app names should not begin with “Spot” or be confusing in sound or spelling to Spotify, and should not imply endorsement, tie-in, co-branding, or promotion without permission. ([Spotify para Desarrolladores][1])

---

## Attribution

If Trama displays Spotify content, it must handle attribution carefully.

Spotify’s Developer Policy says that if an app displays Spotify Content, it must clearly attribute that content as supplied by Spotify, and metadata, cover art, and audio preview clips must link back to the applicable album, content, or playlist on Spotify. ([Spotify para Desarrolladores][1])

Implementation guidelines:

```txt
show provider attribution when displaying Spotify-sourced tracks
link tracks/albums/playlists back to Spotify when possible
do not present Spotify metadata as Trama-owned content
do not offer Spotify metadata or cover art as a standalone product
do not use Spotify green as Trama’s primary brand identity
do not imply Spotify sponsors, endorses, or collaborates with Trama
```

---

## Authentication

Use OAuth Authorization Code with PKCE.

PKCE is recommended for apps where a client secret cannot be safely stored, including mobile apps and single-page apps; this same principle applies to a desktop app where source code is open and secrets cannot be protected. ([Spotify para Desarrolladores][2])

Trama should not require contributors to use a shared client secret.

Recommended setup:

```txt
Each developer creates their own Spotify Developer app.
Each developer provides their own Spotify client ID.
The desktop app uses PKCE.
No Spotify client secret is stored in the repo.
No shared production client ID is committed.
```

Required local config example:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/auth/spotify/callback
```

The exact redirect URI can change depending on Tauri implementation.

Current desktop Lab Mode behavior:

```txt
1. User enters their Spotify Client ID.
2. Trama creates a PKCE authorization URL.
3. User approves in Spotify.
4. User pastes the callback URL or code into Trama.
5. Trama validates callback state.
6. Trama exchanges the code for a token.
7. Trama saves the token in the local Tauri app data directory.
```

The current implementation does not use a client secret and does not display
token values in the UI.

---

## Development mode constraints

Spotify apps begin in Development Mode.

As of the current quota docs:

```txt
newly-created apps start in development mode
the app owner must have Spotify Premium for development-mode apps to function
up to 5 authenticated Spotify users can use a development-mode app
each user must be added to the app allowlist
non-allowlisted users may log in but API requests can return 403
```

Spotify describes Extended Quota Mode as the mode for apps ready for a wider audience, but also says that, as of May 15, 2025, it only accepts quota-extension applications from organizations, with implementation requirements including an established business entity, launched service, at least 250k MAUs, and other criteria. ([Spotify para Desarrolladores][3])

Implication for Trama:

```txt
Do not depend on one shared Spotify app for public open-source usage.
Expect contributors to create their own Spotify app.
Make Demo Mode first-class.
Make the core engine usable without Spotify.
Document 403 errors clearly.
```

---

## Why Demo Mode is required

Because Spotify access can be constrained by Premium requirements, allowlists, API policy changes, and quota restrictions, Trama must be useful without Spotify.

Demo Mode should support:

```txt
mock playback state
mock tracks
mock playlists
mock candidate pools
mock skips
mock completions
mock feedback
real ranking engine
real recommendation explanations
real UI flows
```

Demo Mode is not a toy.

It is the stability layer for open-source contribution.

---

## Allowed adapter responsibilities

The Spotify adapter may implement:

```txt
login with Spotify using PKCE
refresh access tokens
get current playback state
get recently played tracks
get user queue
add item to playback queue
get available devices
read current user playlists
read playlist items
search for items
read current user top items if available
read saved/library items if available
map Spotify objects into Trama models
handle provider-specific errors
```

Spotify’s February 2026 Web API changelog lists currently available endpoints including current playback, playback state, recently played, user queue, add item to queue, current user playlists, search, current user profile, and user top items. It also lists several endpoint removals/changes, so implementation should target current docs and be resilient to future changes. ([Spotify para Desarrolladores][4])

---

## Endpoints likely useful for v0/v1

Potential v0/v1 endpoints:

```txt
GET /me/player/currently-playing
GET /me/player
GET /me/player/recently-played
GET /me/player/queue
POST /me/player/queue
GET /me/playlists
GET /playlists/{playlist_id}
GET /search
GET /me/top/{type}
GET /me
```

Use only the scopes needed for the feature being implemented.

Do not request broad permissions without a clear reason.

---

## Queue insertion

Queue insertion should be handled carefully.

Spotify’s Add Item to Playback Queue endpoint adds an item to the user’s current playback queue, works only for Premium users, and warns that order of execution is not guaranteed when used with other Player API endpoints. ([Spotify para Desarrolladores][5])

Implementation expectations:

```txt
show clear errors when queue insertion fails
record queue actions locally
avoid queueing duplicates
avoid queueing too many tracks at once
do not assume exact queue order after multiple player calls
do not silently keep retrying failed queue actions
```

Queue action should create a local event:

```txt
candidate_queued
```

Or, on failure:

```txt
queue_action_failed
```

---

## Playback observation

Playback observation should be local-first when possible.

Preferred order:

```txt
1. OS media session observer
2. Spotify Web API current playback as fallback or enrichment
3. Demo playback simulator
```

This reduces Spotify API traffic and lets Trama observe the actual local media
session, including Spotify Desktop playback and potentially future providers.

Spotify polling should be conservative when used.

Possible polling loop:

```txt
poll current playback every N seconds
compare previous playback state to current playback state
infer track_started, track_skipped, or track_completed
store event locally
update session state
re-rank candidates
```

Avoid aggressive polling that risks rate limits or unnecessary API load.

Recommended v0 defaults:

```txt
poll interval: 5-10 seconds
faster updates only while active UI is open
back off when playback is paused or unavailable
back off after provider errors
```

---

## Event inference from Spotify playback

Spotify playback state should be mapped into Trama’s normalized `PlaybackState`.

Example:

```ts
type PlaybackState = {
  providerName: "spotify";
  isPlaying: boolean;
  track: Track | null;
  progressMs?: number;
  durationMs?: number;
  device?: PlaybackDevice;
  observedAt: string;
};
```

The observer can infer events:

```txt
track_started
track_completed
track_skipped
track_paused
track_resumed
track_replayed
```

The adapter should not decide ranking.

It should only provide normalized observations.

---

## Candidate generation from Spotify

Spotify should not be treated as the ranking engine.

Spotify can help generate possible candidates through allowed data sources:

```txt
user playlists
playlist items
saved/library tracks if available
recently played tracks
top tracks/artists if available
search results
current artist or album metadata if available
```

Candidate generation should produce `CandidateTrack[]`.

Ranking should happen in `packages/core`.

---

## Avoid unavailable or restricted assumptions

Do not build v0 around endpoints or fields that may be removed, restricted, unavailable, or difficult for new apps to access.

Avoid making the core dependent on:

```txt
Spotify Recommendations endpoint
Spotify Audio Features
Spotify Audio Analysis
Spotify Related Artists
Featured Playlists
Category Playlists
preview URLs
provider-specific popularity fields as required inputs
```

These may be unavailable, changed, or unsuitable depending on the app’s mode and Spotify’s current policy/API state.

If a provider field exists, treat it as optional.

---

## ML and AI restrictions

Do not use Spotify Platform data or Spotify Content to train machine learning or AI models.

Spotify’s Developer Policy says not to use the Spotify Platform or Spotify Content to train a machine learning or AI model or otherwise ingest Spotify Content into an ML/AI model. ([Spotify para Desarrolladores][1])

For Trama v0/v1:

```txt
no LLM ranking loop
no model training on Spotify content
no remote recommender trained from Spotify data
no ingestion of Spotify content into ML/AI models
```

Allowed project direction:

```txt
transparent local scoring
event-based ranking
user-controlled feedback
fixture-based evaluation
optional future local learning only after policy review
```

If future versions explore learning, they should be designed carefully and documented separately.

---

## Do not analyze Spotify for external metrics

Spotify’s policy includes restrictions on analyzing Spotify Content or the Spotify Service for purposes such as derived listenership metrics, benchmarking, usage statistics, user metrics, or advertising/marketing profiles. ([Spotify para Desarrolladores][1])

For Trama:

```txt
do not build analytics products around Spotify data
do not sell or publish derived Spotify listenership metrics
do not benchmark Spotify’s recommender
do not create advertising profiles
do not collect centralized listening analytics by default
```

The local event log exists to support the user’s own session experience and the local ranking engine.

---

## Commercial use boundary

Trama is intended as a non-commercial open-source project.

Spotify’s policy includes restrictions around commercial use, especially for Streaming SDAs, and says streaming through the Spotify Platform is only permitted for Premium subscribers. ([Spotify para Desarrolladores][1])

For Trama:

```txt
do not monetize Spotify playback integration
do not sell access to Spotify-integrated features
do not run ads against Spotify streaming integration
do not present Trama as a commercial streaming app
```

Open-source contribution, local experimentation, and personal utility are the intended boundaries.

---

## Provider errors

The Spotify adapter should map provider errors into typed Trama errors.

Suggested errors:

```ts
type SpotifyAdapterError =
  | "SPOTIFY_NOT_CONNECTED"
  | "SPOTIFY_TOKEN_EXPIRED"
  | "SPOTIFY_PREMIUM_REQUIRED"
  | "SPOTIFY_USER_NOT_ALLOWLISTED"
  | "SPOTIFY_PLAYBACK_UNAVAILABLE"
  | "SPOTIFY_NO_ACTIVE_DEVICE"
  | "SPOTIFY_QUEUE_INSERT_FAILED"
  | "SPOTIFY_RATE_LIMITED"
  | "SPOTIFY_FORBIDDEN"
  | "SPOTIFY_UNKNOWN_ERROR";
```

User-facing examples:

```txt
Spotify is not connected.
Reconnect your Spotify account.

Queue insertion failed.
Spotify queue control may require Premium.

This Spotify app is in Development Mode.
Your account may need to be added to the app allowlist.

No active Spotify device found.
Start playback in Spotify and try again.
```

---

## Token storage

Access tokens and refresh tokens must be handled carefully.

Guidelines:

```txt
do not commit tokens
do not log tokens
do not expose tokens in UI
prefer secure OS storage when available
encrypt or protect local token storage where practical
clear tokens on logout
document token storage behavior
```

Potential Tauri direction:

```txt
use OS keychain/credential manager if available
fallback to local encrypted storage only if necessary
```

Current desktop Lab Mode behavior:

```txt
token cache file: spotify-token.json in the Tauri app data directory
stored fields: access token, token type, expiry time, optional refresh token, scope, saved time
clear action: available in the Spotify Auth Lab panel
```

This is suitable for local development smoke testing, but before a broader
release Trama should review whether to move token storage to the OS credential
store.

Refresh behavior:

```txt
If the access token is expired or near expiry, Trama refreshes it with the
stored refresh token before reading playback state.
```

---

## Scope management

Request the minimum scopes needed.

Possible scopes by feature:

```txt
Read current playback:
  user-read-currently-playing
  user-read-playback-state

Read recently played:
  user-read-recently-played

Read playlists:
  playlist-read-private
  playlist-read-collaborative

Control queue/playback:
  user-modify-playback-state

Read top tracks/artists:
  user-top-read

Read library:
  user-library-read
```

Do not request write scopes unless the feature needs them.

Do not request playlist modification scopes in v0 unless Trama actually creates or edits playlists.

Initial Liam control uses Spotify Web API playback control:

```txt
queue explicit track URI
pause playback
resume playback
skip next
skip previous
```

These actions control what Spotify plays, but they do not control Spotify Mix
transition curves, EQ, fade length, waveform anchors, or internal audio DSP.
Queue/control failures should surface provider recovery steps such as missing
Premium, no active device, or expired auth.

---

## Local configuration

Use local environment variables or local config.

Example:

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/auth/spotify/callback
```

Never commit:

```txt
client secrets
access tokens
refresh tokens
personal account data
production config
```

For open-source contributors, document setup clearly:

```txt
1. Create Spotify Developer app.
2. Add redirect URI.
3. Copy Client ID.
4. Create local config.
5. Run Trama.
6. Connect Spotify.
```

---

## Adapter interface

The Spotify adapter should satisfy a provider interface.

Example:

```ts
interface MusicProviderAdapter {
  providerName: ProviderName;

  connect(): Promise<ProviderConnection>;
  disconnect(): Promise<void>;

  getCurrentPlayback(): Promise<PlaybackState>;
  getRecentlyPlayed(limit?: number): Promise<Track[]>;

  getUserPlaylists(): Promise<Playlist[]>;
  getPlaylistTracks(playlistId: string): Promise<Track[]>;

  searchTracks(query: string, limit?: number): Promise<Track[]>;

  getQueue?(): Promise<ProviderQueue>;
  addToQueue(track: Track): Promise<QueueActionResult>;
}
```

Spotify-specific implementation should live in:

```txt
packages/spotify-adapter
```

The core should depend only on normalized Trama types.

---

## Mapping examples

Spotify track to Trama track:

```txt
Spotify Track Object
  -> mapSpotifyTrackToTrack()
  -> Track
```

Example output:

```ts
const track: Track = {
  id: "trk_local_123",
  providerIds: {
    spotify: "spotify:track:abc123"
  },
  title: "Track Name",
  artists: [
    {
      id: "artist_local_123",
      name: "Artist Name",
      providerIds: {
        spotify: "spotify:artist:def456"
      }
    }
  ],
  album: {
    id: "album_local_123",
    title: "Album Name",
    artworkUrl: "https://..."
  },
  durationMs: 210000,
  popularity: 67,
  artworkUrl: "https://...",
  source: "provider_current_playback",
  createdAt: "...",
  updatedAt: "..."
};
```

Mapping should be tested.

---

## Rate limits and backoff

Implement conservative API behavior.

Expected behavior:

```txt
use polling intervals, not tight loops
back off after 429 responses
respect Retry-After headers when provided
cache metadata locally
avoid refetching unchanged playlists repeatedly
avoid running candidate generation on every render
```

Provider calls should be service-level operations, not React render side effects.

---

## UI requirements for Spotify mode

Spotify mode should show:

```txt
connection status
active playback state
provider attribution
queue action result
clear error states
setup instructions when disconnected
```

Do not make Spotify mode the only path through the app.

Demo Mode should remain available even when Spotify is disconnected.

---

## Compliance checklist before release

Before a public release, check:

```txt
No Spotify secrets committed.
No tokens logged.
No misleading Spotify branding.
No app name confusingly similar to Spotify.
No claim of Spotify endorsement.
No claim that Trama replaces Spotify recommendations.
No ML/AI model trained on Spotify Platform data or Spotify Content.
No commercial monetization of Spotify integration.
Demo Mode works without Spotify.
Core engine works without Spotify.
Spotify setup docs explain development-mode limitations.
Provider errors are clear and recoverable.
Spotify content displayed with appropriate attribution/linking.
```

---

## Open questions

To resolve during implementation:

```txt
exact redirect URI strategy for Tauri
secure token storage mechanism
whether to support custom protocol redirects
how much playlist data to cache
how to deduplicate provider tracks locally
how to handle unavailable queue items
whether to use Spotify search in v0 or wait until v0.2
how to present attribution in the cleanest UI form
```

---

## Guiding sentence

Spotify is an adapter, not the project.

Trama should remain useful, testable, and understandable even when Spotify is disconnected.

