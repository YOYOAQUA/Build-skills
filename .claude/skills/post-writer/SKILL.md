---
name: post-writer
description: Write a complete social media post (hook + body + CTA) from a topic or idea, sized for the target platform (Instagram, TikTok, LinkedIn, X/Twitter, Threads, Facebook, YouTube Shorts). Reads brand/brand-brief.md for voice and CTA and pulls hook patterns from the viral-hooks library. Use when the user says "write a post", "turn this idea into a post", "caption for", "script a reel about".
---

# Post Writer

Turn a raw idea into a ready-to-publish post: hook + body + CTA, in the brand's voice, sized for the platform.

## Step 0 - Load context

1. Read `brand/brand-brief.md`. If missing, ask 3 quick questions (what you sell, who buys, what action you want) and suggest `/brand-brief` later. Don't block on it.
2. Read `.claude/skills/viral-hooks/references/hooks.md` for hook frameworks.
3. Confirm: **topic**, **platform**, **format** (text post / caption / video script / carousel / thread). If the user gave only a topic, default to their primary platform from the brief.

## Step 1 - Find the angle

A topic is not a post. Pick ONE angle before writing:
- **Mistake** - what most people get wrong about this
- **Receipt** - a result + how it happened
- **Contrarian** - a common belief you disagree with
- **Story** - a specific moment that taught a lesson
- **How-to** - steps the reader can do today

Write one sentence: "The one thing the reader walks away with is ___." If you can't, the angle isn't sharp yet.

## Step 2 - Write 5 hooks, pick the best

Generate 5 hooks from different categories in the hook library. Each must:
- Be under 12 words (spoken) or one line (written)
- Create a gap the body closes
- Name the audience or their pain when possible
- Avoid starting with "In today's world", "Did you know", "Hey guys"

Pick the strongest one and show the other 4 as alternates.

## Step 3 - Body

Structure: **Hook -> Context (why care) -> Value (the meat) -> Payoff -> CTA**

- One idea per line. White space is a feature.
- Specific beats generic: numbers, names, timestamps, places.
- Open loops in the first third, close them before the CTA.
- Write at a 6th-grade reading level. Short words, short sentences.
- Use the voice from the brief - match the voice sample's rhythm and slang.

## Step 4 - CTA

One CTA, pulled from the brief's Primary CTA. Make it low friction and tied to the value:
- "Comment GUIDE and I'll send you the checklist"
- "Save this for your next ___"
- "Follow for part 2"
Never stack 3 CTAs.

## Platform sizing

| Platform | Format | Length | Notes |
|---|---|---|---|
| Instagram caption | Reel/carousel caption | 125-300 words | First 125 chars must hook (cut-off). 3-5 hashtags max |
| Instagram carousel | Slides | 6-10 slides, max ~25 words/slide | Slide 1 = hook, last slide = CTA |
| TikTok / Reels / Shorts script | Spoken | 30-60 sec = 75-150 words | Hook in first 2 sec. Add [VISUAL] cues |
| LinkedIn | Text post | 150-300 words | Hook + rehook in first 2 lines (cut-off ~210 chars). No links in body |
| X / Twitter | Single post | <= 280 chars | Or thread: 5-8 posts, each standalone |
| Threads | Post | <= 500 chars | Conversational, question endings work |
| Facebook | Post | 80-250 words | Story-driven, community tone |

## Output format

```
PLATFORM: <platform> | FORMAT: <format> | ANGLE: <angle>

--- POST ---
<the full post, ready to copy-paste>

--- ALT HOOKS ---
1. ...
2. ...
3. ...
4. ...

--- NOTES ---
- Hook category used: <category>
- Suggested visual/thumbnail: <one line>
```

## After writing

Offer: "Want me to grade it with /post-grader or schedule it with /post-scheduler?"

## Rules
- Write in the language of the brief (or the user's language if no brief). Hebrew posts are written natively, not translated.
- No em-dashes. Use short hyphens or line breaks.
- No AI tells: "delve", "unlock", "game-changer", "in today's fast-paced world", "let's dive in".
- Never invent receipts. Use only numbers from the brief or the user. If none, write the post without fake proof.
