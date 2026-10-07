---
name: wellness-news
description: News-curator engine for Yoav's wellness content. Searches the past week's wellness, workplace-wellbeing, longevity, recovery, cold/breathing, wearables and wellness-business news from proven sources, scores each story, and writes ready-to-post Hebrew posts in the "news curator + interpretation" format (modeled on @shai_elancry's top posts) with a corporate twist for LinkedIn. Also builds the weekly roundup carousel. Use when the user says "תביא חדשות", "מה קרה השבוע בוולנס", "news posts", "weekly roundup", "סיכום שבועי", "run the news engine", or during the Sunday content batch.
---

# Wellness News Engine

Turns the week's wellness news into posts. One run = a news digest file + 3-5 ready posts + one weekly roundup carousel.

The format is modeled on the top-performing posts of @shai_elancry (see `research/shai-elancry-teardown.md`): a big-name news hook, source credibility, concrete details, "what's interesting here", a personal take, a light close. Yoav's difference: **every story gets translated to what it means for organizations.**

## Step 0 - Load context
1. Read `brand/brand-brief.md` (voice, audience, CTA).
2. Read `.claude/skills/wellness-news/references/sources.md` (where to look, query bank).
3. Read `research/shai-elancry-teardown.md` (the post formula).
4. Check `content/news/` for the last 2 digests - **never repeat a story already covered.**
5. Date window: last 7 days (or what the user asked). Get today's date from the environment.

## Step 1 - Collect (aim for 15-25 candidate stories)
Run searches from the query bank in `references/sources.md`, all 6 lanes, both English and Hebrew. Use WebSearch (standard; extended only if a lane comes back thin). Prefer the source domains listed for each lane.

Also check Gmail if the Gmail connector is available: search `newer_than:7d` for the newsletters listed in sources.md (e.g. `from:wellnessintelligence@substack.com`). Treat newsletter content as a lead to verify, not as a source to quote.

For each candidate record: headline, date, source + URL, the 1-2 concrete facts (numbers, names, dates), lane.

**Rules:**
- A story needs a named source with a URL. No URL = drop it.
- Rumors (e.g. Bloomberg on Apple) are fine **if labeled as a report, not an announcement**, the way Shai does.
- Never invent or round numbers. Quote them exactly as the source gives them.
- Prefer primary sources (the company's announcement, the report itself) over aggregator rewrites.

## Step 2 - Score and pick
Score each candidate 0-3 on each criterion, total out of 15:
| Criterion | 3 = |
|---|---|
| **Big name** | Apple, Nike, Google, a top athlete, a government, a luxury brand, Gallup/WHO/McKinsey |
| **Concrete number or date** | A specific figure, price, date or percentage |
| **Fresh** | Last 72 hours |
| **Org angle** | Clear "what it means for employers / managers / HR" |
| **Yoav fit** | Recovery, cold, breathing, burnout, longevity, resilience, wellness spaces, reservists, Israel |

Pick the top 3-5 for full posts (at least one with an Israeli angle if any exists, at least one from the workplace lane). The top 6-8 go into the weekly roundup.

## Step 3 - Write the posts
For each picked story write **two versions**:

### A. Instagram (Shai's format, Yoav's voice) - 800-1,300 chars
1. **Line 1 = the news with the big name.** "אפל בוחנת...", "גאלופ פרסמו...", "איחוד האמירויות משיקה..."
2. **Context + source credibility** (1-2 lines): who reported it and how solid it is
3. **Concrete details**: numbers, dates, names - exactly as the source gives them
4. **"מה שמעניין כאן"**: the trend or business logic behind the news
5. **"בעיניי"**: Yoav's short personal take, from his world (cold, recovery, ex-office, father, special unit) - only facts from the brand brief, never invented biography
6. **Light close**: a question, a wink, or "מי מצטרף?"

### B. LinkedIn (same story, corporate twist) - 900-1,500 chars
Same hook and facts, then replace step 6 with:
- **"ומה זה אומר לארגון שלכם?"** - 2-4 lines translating the news into a decision an HR/CEO faces (budget line, managers, recovery, retention)
- CTA from the brief (e.g. "תגיבו 'מדד'")

### C. Visual note (1 line)
What image or carousel cover to use (product photo, big number on a solid background, etc.).

Style rules: Hebrew, short hyphens only (never em-dashes), short lines, no hashtag walls (max 3), source credit at the end: "(מקור: Bloomberg)". Run each post through the `post-grader` criteria mentally: the hook must earn 80+.

## Step 4 - Weekly roundup carousel ("השבוע שהיה בוולנס")
Shai's #1 post format. 8-10 slides:
- Slide 1 (cover): "השבוע שהיה בוולנס | [תאריכים]" + 3 teaser words
- Slides 2-8: one story per slide - headline (max 8 words) + one line "למה זה חשוב" + source
- Slide 9: "ומה זה אומר לארגונים?" - 3 bullets
- Slide 10: CTA + "שמרו את הפוסט"
Plus the caption (600-900 chars).

## Step 5 - Save
Write everything to `content/news/YYYY-MM-DD.md` (today's date):
```
# חדשות וולנס - [date range]
## מועמדים (טבלה: ציון | כותרת | מקור | URL | lane)
## פוסט 1 ... (Instagram / LinkedIn / visual)
## סיכום שבועי (slides + caption)
## לא נבחרו (one line each, for next week)
```
Then tell the user in 5 lines: what was found, which posts are ready, and where the file is. Suggest which post goes to which day in the LinkedIn calendar (`strategy/linkedin-content-plan.md`).

## Guardrails
- Every fact in a post must trace to a URL in the digest. If unsure, cut it.
- Health claims: report what the study/company said; no medical advice; no "cures".
- Don't copy Shai's (or anyone's) captions or cover his exact stories in the same week. Same source types, different angle.
- Mark Israeli-market claims you couldn't verify as "(לא אומת)" in the digest, and leave them out of posts.
