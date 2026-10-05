---
name: repurpose
description: Turns one long-form input (blog post, newsletter, YouTube transcript, podcast, or script) into 3 platform-native posts - not copy-paste clones, but each rebuilt for how that platform consumes content. Default trio is short-form video script + LinkedIn/text post + Instagram carousel. Use when the user says "repurpose this", "turn this video into posts", "chop up my newsletter", or pastes long content and asks for social posts.
---

# Repurpose

One piece of long content -> 3 native posts. Each one should work as if it was created for that platform first.

## Step 0 - Load context

1. Read `brand/brand-brief.md` (voice, CTA, platforms). If missing, continue and suggest `/brand-brief` at the end.
2. Read `.claude/skills/viral-hooks/references/hooks.md`.
3. Get the input: pasted text, a file path, or a transcript. If it's a URL you can't fetch, ask the user to paste the text.

## Step 1 - Mine the source

Read the full input and extract a **nugget list** (show it to the user):

| # | Nugget | Type | Strength (1-5) |
|---|---|---|---|
| 1 | <one-sentence idea> | Story / Stat / Mistake / Framework / Quote / Contrarian take | |

Look for:
- Specific numbers and results (receipts)
- A moment of tension or a story
- A framework or list of steps
- A line that's quotable on its own
- An opinion that goes against the grain

Pick the **top 3 nuggets** - one per output post. Different nuggets per post, so the audience isn't seeing the same post 3 times.

## Step 2 - Choose the 3 formats

Default trio (override with user's platforms from the brief):

1. **Short-form video script** (Reels/TikTok/Shorts, 30-60 sec) - best for the story or the contrarian take
2. **Text post** (LinkedIn/X/Threads) - best for the framework or lesson
3. **Carousel** (Instagram/LinkedIn, 6-10 slides) - best for steps, lists, before/after

## Step 3 - Build each post native

### Video script
```
HOOK (0-2s): <line>  [VISUAL: ...]
SETUP (2-10s): <why it matters>
VALUE (10-45s): <3 beats max>
PAYOFF (45-55s): <the twist/lesson>
CTA (55-60s): <one action>
```
Written to be spoken - contractions, short sentences, natural rhythm.

### Text post
Hook line + rehook line (both visible before "see more"), then short lines, white space, one CTA. 150-300 words.

### Carousel
```
Slide 1: Hook (big text, <10 words)
Slide 2: The problem / why care
Slides 3-8: One point per slide, <25 words each
Slide 9: Summary / payoff
Slide 10: CTA
```
Plus a caption (first 125 chars hook).

## Output format

```
SOURCE: <title/type> | NUGGETS FOUND: <n>

=== POST 1 - <format> - <platform> ===
Nugget: <which one>
<full post>

=== POST 2 - ...
=== POST 3 - ...

BONUS: 5 more nuggets you can turn into posts later
1. ...
```

## After
Offer: grade any of them with `/post-grader`, or schedule with `/post-scheduler`.

## Rules
- Never just shorten the source. Re-angle it.
- Keep the creator's voice and any signature phrases from the source.
- Don't invent facts that aren't in the source or the brief.
- Output in the source's language unless the user asks otherwise.
- No em-dashes.
