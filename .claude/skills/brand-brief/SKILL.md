---
name: brand-brief
description: Capture or update a small business owner's brand brief - what they sell, who buys, the action they want people to take, voice, content pillars and proof points. Saves it to brand/brand-brief.md so every other content skill (post-writer, post-grader, repurpose, content-coach) writes on-brand. Use when the user says "set up my brand", "update my brief", "who is my audience", or when another skill needs a brief and none exists.
---

# Brand Brief

Build a one-page brand brief that every other content skill reads before writing. One source of truth - no re-explaining the business every session.

## Where it lives

`brand/brand-brief.md` at the project root. If it exists, read it first and run in **update mode**. If not, run in **create mode**.

## Create mode - the interview

Ask in small batches (2-3 questions per message), not a 20-question wall. Skip anything the user already answered. Accept short answers - you fill gaps with smart defaults and flag them as `(assumed)`.

**Batch 1 - The business**
1. What do you sell? (product/service, price range)
2. What problem does it solve - in the customer's words, not yours?
3. What makes you different from the 3 alternatives people usually pick?

**Batch 2 - The buyer**
4. Who buys? (role, life stage, the moment they go looking for you)
5. What do they believe right now that keeps them stuck?
6. What objection kills the sale most often?

**Batch 3 - The action**
7. What ONE action do you want a viewer to take? (DM a keyword, book a call, join a list, buy)
8. Where does that action happen? (link, DM word, landing page URL)

**Batch 4 - The voice**
9. 3 words that describe how you talk. 3 words you never want to sound like.
10. Language(s) you post in, and slang/terms your audience uses.
11. Paste 1-2 posts you loved writing (optional - best voice signal).

**Batch 5 - Proof and story**
12. Numbers, results, client wins, credentials (receipts).
13. Your origin story in 3 sentences - why you do this.

**Batch 6 - Distribution**
14. Platforms you post on now, and the one that matters most.
15. Realistic posting frequency per week.

## Output - write `brand/brand-brief.md`

Use exactly this template so other skills can parse it:

```markdown
# Brand Brief - <Business name>
_Last updated: <YYYY-MM-DD>_

## One-liner
I help <who> <get what result> without <pain/cost>.

## Offer
- What: 
- Price range: 
- Differentiator: 

## Ideal buyer
- Who: 
- Trigger moment: 
- Current belief keeping them stuck: 
- Top objection: 

## Primary CTA
- Action: 
- Where: 

## Voice
- Sounds like: 
- Never sounds like: 
- Language: 
- Audience vocabulary: 
- Voice sample: 

## Content pillars (3-5)
1. <Pillar> - <why it matters to the buyer>

## Receipts (proof)
- 

## Origin story
<3 sentences>

## Platforms
- Primary: 
- Secondary: 
- Frequency: 
```

## Deriving content pillars

Don't just ask for pillars - derive them. Good pillars map to the buyer's journey:
- **Problem pillar** - the pain and why the usual fixes fail
- **Method pillar** - how you do it (teach the what, sell the how)
- **Proof pillar** - results, case studies, behind the scenes
- **Belief pillar** - your contrarian takes and values
- **Person pillar** - your life, story, the human behind the brand

Propose 3-5, let the user cut or rename.

## Update mode

1. Show a 5-line summary of the current brief.
2. Ask what changed (new offer, new audience, new CTA, new results).
3. Edit only those sections, bump `_Last updated_`, keep everything else.

## Rules
- Customer's words beat marketing words. If the user says "leverage synergies", ask "how would your customer say that?"
- Mark guesses as `(assumed)` so the user can fix them later.
- Keep it to one page. If a section balloons, cut to the strongest 3 items.
- After saving, tell the user what's next: "Run /post-writer or /content-coach - they'll use this brief automatically."
