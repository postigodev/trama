# Project Thesis

Trama is built around a simple claim:

> Musical taste is not only a profile. It is a relation produced in context.

Most recommendation systems describe users through relatively stable profiles: favorite artists, repeated genres, saved tracks, listening history, demographic signals, and long-term behavior.

Those signals matter.

But they are not enough to explain what should play next.

A person does not listen as an abstract average of themselves. A person listens from a concrete situation: a time of day, a mood, a current track, a recent chain of songs, a device, a room, a task, a social setting, and a series of choices that have already shaped the session.

Trama is an attempt to build around that concrete situation.

---

## The problem

Music apps often understand long-term taste better than they understand session continuity.

They may know that a user likes an artist, genre, or mood in general. But a song can be correct for the user and wrong for the current session.

A recommendation can fail even when it is statistically reasonable.

Examples:

```txt
A user likes rock en español,
but the current session is dark melodic trap.

A user likes energetic music,
but the current session is late-night and low-pressure.

A user likes a popular artist,
but the session is asking for deep cuts and less obvious choices.

A user likes study music,
but study music should not contaminate their general music taste.
````

The contradiction is not simply:

```txt
good recommendation vs bad recommendation
```

The contradiction is:

```txt
abstract taste profile vs concrete listening session
```

Trama focuses on the second side of that contradiction.

---

## Taste as relation

A track is not recommended in isolation.

It becomes a recommendation only inside a relation:

```txt
user
  + current track
  + recent session history
  + skipped tracks
  + completed tracks
  + manual feedback
  + candidate pool
  + platform constraints
  + ranking logic
```

That relation is the trama.

The same track can be:

```txt
good in one session
bad in another session
safe in one context
boring in another context
surprising in one chain
disruptive in another chain
```

Trama treats recommendation as a relational problem, not just an item-matching problem.

---

## Why session matters

A listening session has direction.

It is not merely a list of songs played one after another. It develops through acceptance, rejection, repetition, interruption, and adjustment.

Every event changes the structure of the session:

```txt
completion -> reinforces the current direction
early skip -> rejects a possible direction
replay -> intensifies affinity
manual "more like this" -> makes the signal explicit
manual "less like this" -> marks a boundary
"broke the mood" -> identifies a structural mismatch
```

This means the next recommendation should not only ask:

```txt
Does this user like this kind of music?
```

It should also ask:

```txt
Does this track belong to the direction this session is taking?
```

---

## Long-term taste vs current session

Trama separates two forms of preference:

```txt
long_term_profile = what the user tends to like across time
short_term_session = what the user appears to want right now
```

Both matter.

But they should not be collapsed into one signal.

Long-term taste helps generate candidate tracks.
Current session context helps decide which candidates belong next.

In Trama, the session is not a minor detail added after the fact. It is the primary object of ranking.

---

## The queue as structure

A queue is often treated as a sequence.

Trama treats it as a structure.

The order matters.
The transition matters.
The reason a track appears next matters.
The difference between “good song” and “good next song” matters.

A track that is individually strong can still damage the session if it breaks continuity too sharply. Another track may be less obvious but more correct because it preserves the direction already established.

This is the core product intuition:

> The next song should belong to the session, not just to the user.

---

## Against black-box magic

Trama should not hide behind vague claims of artificial intelligence.

The first versions should be inspectable:

```txt
events are visible
scores are explainable
penalties are understandable
feedback changes behavior
ranking reasons are shown
```

A user should be able to ask:

```txt
Why did Trama recommend this?
```

And the system should answer in concrete terms:

```txt
It matches the last completed tracks.
It has not been played recently.
It appears in a related playlist cluster.
It avoids artists skipped earlier in this session.
It fits the current strictness setting.
```

This is not only a UX decision. It is a technical principle.

Opaque recommendations are harder to debug, harder to trust, and harder to improve through open-source contribution.

---

## Local-first as a design position

Trama should be local-first by default.

This is not only about privacy, although privacy matters.

It is also about control.

A local-first architecture means:

```txt
the user owns the event log
the user can inspect the session history
the ranking logic can run without a central server
contributors can test the engine without platform permission
the system can remain useful even if adapters change
```

Trama should not require a central recommendation service to be meaningful.

The system should begin as a personal tool that runs close to the listener.

---

## Platform adapters are not the core

Trama may integrate with Spotify first, but Spotify is not the project.

The core project is the session-aware queue engine.

A provider adapter can supply:

```txt
current playback
recently played tracks
playlist/library data
candidate tracks
queue control
```

But the provider adapter should not define the recommendation logic.

This distinction matters because platforms change their APIs, policies, and incentives. Trama should preserve a modular architecture where the engine can survive beyond any single provider.

```txt
core engine != provider adapter
```

---

## Product boundary

Trama is not a streaming service.

Trama is not a platform replacement.

Trama is not a commercial recommendation product.

Trama is not an attempt to copy another company’s recommender.

Trama is an open-source experiment in session-aware queue ranking.

Its value comes from making a narrow problem explicit:

```txt
How should a music queue adapt to the current session?
```

---

## The material problem

The listener experiences music as flow.

The platform often represents the listener as data.

That gap produces friction.

A platform may store a taste profile, but the listener is not always acting from that profile. The listener is doing something concrete: walking, coding, lifting, studying, driving, grieving, partying, cleaning, dissociating, focusing, remembering.

Those situations are not just decorative context.

They change what the next track should be.

Trama begins from that material fact.

---

## What success looks like

Trama succeeds if the user feels:

```txt
the next track makes sense
the session was not broken
the system learned from refusal
the system did not overfit to old taste
the recommendation was understandable
the user remained in control
```

Technically, success means:

```txt
skip detection works
completion signals matter
feedback changes ranking
recommendations include explanations
the core engine is testable without Spotify
the UI makes the session legible
contributors can modify ranking logic safely
```

---

## Guiding sentence

If Trama needs one sentence to guide decisions, it is this:

> Do not recommend the best song in general. Recommend the song that belongs next.
