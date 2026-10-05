---
name: post-grader
description: Grade a social media post for VIRALITY. Scores hook strength (50% - most critical), curiosity/retention, emotional pull, clarity, value and CTA, then returns a 0-100 score, a letter grade, the exact lines to fix, and a rewritten version. Use when the user says "grade my post", "will this go viral", "score this", "review my caption/script/hook".
---

# Post Grader

Score a post before it goes live. Brutal, specific, fixable.

## Inputs

- The post (text, caption, script, or carousel slides)
- Platform (ask if unclear - it changes the hook window)
- Optional: read `brand/brand-brief.md` to check it fits the audience and CTA

## Scoring rubric (100 points)

### 1. Hook strength - 50 pts (most critical)
If the hook fails, nothing else gets seen. Score the first line / first 2 seconds:

| Points | Criteria |
|---|---|
| 0-10 | **Stop power** - would a scroller pause? Pattern interrupt, bold claim, specific number, unexpected word |
| 0-10 | **Curiosity gap** - does it open a question the reader NEEDS answered? |
| 0-10 | **Audience callout** - does the right person instantly know it's for them? |
| 0-10 | **Specificity** - concrete (numbers, names, timeframes) vs vague |
| 0-10 | **Brevity** - under 12 words / fits before the platform cut-off |

### 2. Curiosity & retention - 15 pts
- Open loops that get paid off later
- Each line earns the next (no dead lines)
- Pacing - short lines, no walls of text

### 3. Emotional pull - 10 pts
Triggers at least one: surprise, validation, fear of missing out, aspiration, anger at a common enemy, humor, relief.

### 4. Value & clarity - 15 pts
- One clear idea, not three
- Reader can act or think differently after
- 6th-grade readability, no jargon

### 5. CTA - 10 pts
- One clear action, low friction, matches the brief's primary CTA
- Tied to the post's value (not a random "follow me")

## Grade scale

| Score | Grade | Meaning |
|---|---|---|
| 90-100 | A+ | Ship it now |
| 80-89 | A | Strong - small polish |
| 70-79 | B | Decent - hook or payoff needs work |
| 60-69 | C | Will get scrolled past - rewrite hook |
| < 60 | D/F | Rethink the angle |

## Output format

```
VIRALITY SCORE: <n>/100  (<grade>)

HOOK: <n>/50
  Stop power <n>/10 | Curiosity <n>/10 | Callout <n>/10 | Specific <n>/10 | Brevity <n>/10
RETENTION: <n>/15
EMOTION: <n>/10
VALUE & CLARITY: <n>/15
CTA: <n>/10

TOP 3 FIXES (highest impact first)
1. Line: "<quote the exact line>"
   Problem: <why it hurts>
   Fix: "<rewritten line>"
2. ...
3. ...

3 STRONGER HOOKS
1. <hook> - <category from viral-hooks>
2. ...
3. ...

REWRITTEN POST
<full improved version>

PROJECTED SCORE AFTER FIXES: <n>/100
```

## Rules
- Quote exact lines. "Make the hook stronger" is useless - show the stronger hook.
- Be honest. A 62 is a 62. Inflated scores waste the user's reach.
- Respect the voice - the rewrite must sound like the user, not like a marketing bot.
- Pull alternate hooks from `.claude/skills/viral-hooks/references/hooks.md`.
- Grade in the post's language. A Hebrew post gets graded and rewritten in Hebrew.
- No em-dashes in your output.
