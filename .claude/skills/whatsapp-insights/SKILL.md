---
name: whatsapp-insights
description: Analyze the user's own WhatsApp chats locally and build a private Hebrew personality report - archetype (12 classic archetypes), Big Five traits, the faces they show in different circles, relationship style, love languages, values vs reality, inner voice, group roles, the year as a wave, and a digital recovery score. Reads WhatsApp Desktop for Mac directly (all chats at once), or WhatsApp "Export chat" files on any computer. Use when the user says "תנתח את הוואטסאפ שלי", "מה הוואטסאפ שלי יודע עליי", "ציון התאוששות דיגיטלית", "analyze my WhatsApp", "WhatsApp insights", or shares a WhatsApp chat export.
---

# WhatsApp Insights - מה הוואטסאפ שלך יודע עליך

Turns the user's WhatsApp history into a local report.html. Scripts are Python 3 standard library and never print message content.

## Ground rules
- **Local only.** Never paste data.json or sample.md into the chat. Read sample.md with the Read tool only to write insights.json.
- **Speak Hebrew, short and warm.** Before the gender question use neutral wording. After it: masculine for גבר and for מעדיף/ה לא לציין, feminine for אישה. Same rule inside insights.json.
- **Receipts, not horoscope.** Every insight carries a number from summary.json or a short quote (max ~12 words) of the user's own messages. Never quote other people's messages. Never invent numbers.
- **Mirror, not diagnosis.** No clinical labels. "הנה מה שעולה מהשיחות שלך".
- **Distress.** If `summary.distressFlag` is true: gentle tone, no jokes, `"distress": true`, and mention ער"ן (1201, 24/7) in chat.

## 1. Pick the route
```bash
SKILL_DIR="<this skill's base directory>"
OUT="$HOME/WhatsApp-Insights/$(date +%Y-%m-%d)"
mkdir -p "$OUT"
uname; test -f "$HOME/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite" && echo HAS_DB
```

**A. Mac with WhatsApp Desktop (HAS_DB).** Tell the user in one line that you read the chats on their computer only, and macOS may ask for permission - click Allow. Then:
```bash
python3 "$SKILL_DIR/scripts/extract_mac.py" --out "$OUT/data.json" --months 12
```
- exit 1 (no DB) → route B.
- exit 3 (permission) → relay the printed Hebrew instructions, wait for the user, rerun.
- exit 2 (schema changed) → read the printed tables/columns and write a one-off read-only query on a temp copy that produces the same data.json contract (below). Do not modify the original DB.
- `python3` missing → ask the user to accept the Command Line Tools install (`xcode-select --install`), then rerun.
- `--months 0` = full history (bigger and slower). Default is the last 12 months.

**B. Exported chats (any computer).** Explain how to export, without media:
- אייפון: פותחים את הצ'אט ← לוחצים על השם למעלה ← ייצוא צ'אט ← ללא מדיה ← שומרים לקבצים
- אנדרואיד: פותחים את הצ'אט ← ⋮ ← עוד ← ייצוא צ'אט ← ללא מדיה

Ask for the file paths (dragging files into the terminal works; .txt or .zip). Run without `--me` first:
```bash
python3 "$SKILL_DIR/scripts/parse_export.py" FILE1 [FILE2 ...] --out "$OUT/data.json"
```
Exit 4 prints the participants - ask which one is the user, then rerun with `--me "NAME"` (repeat `--me` if the name differs between files).

data.json contract: `{"version":1,"source":"mac-db"|"export","generatedAt","me","range":{"from","to"},"chats":[{"name","type":"private"|"group","messages":[{"t":"YYYY-MM-DDTHH:MM:SS" local,"s","me","x","media"}]}]}`, messages sorted per chat.

## 2. Numbers
```bash
python3 "$SKILL_DIR/scripts/analyze.py" "$OUT/data.json" --out-dir "$OUT"
```
Read `$OUT/summary.json` (recovery score, rhythm, top chats, reply times, limiting phrases, distressFlag).

## 3. Three quick questions
Ask in one go (use AskUserQuestion if available):
- מגדר: גבר / אישה / מעדיף/ה לא לציין → `--gender m|f|x`
- ילדים: כן / לא → `--kids yes|no`
- עיסוק: שכיר/ה / עצמאי/ת / יזם/ית / אחר → `--occupation employee|freelancer|founder|other`

## 4. Write insights.json (the personality reading)
Read `$OUT/summary.json` in full, especially `personality` (style, vocabDiversity, topics, relationship, love, groups, monthly) and `topChats[].style`. Then read all of `$OUT/sample.md` (in chunks if long). The `>` lines in the sample are other people's messages, there for context only.

Write `$OUT/insights.json`, all strings in Hebrew, gendered by the answer to the gender question:
```json
{"archetype":{"primary":"creator","secondary":"caregiver","tagline":"...","why":"...","evidence":["...","..."]},
 "bigFive":[{"trait":"openness","score":4,"body":"...","evidence":"..."}],
 "faces":[{"context":"עם המשפחה","chats":"...","tone":"...","body":"...","evidence":"..."}],
 "relationship":{"title":"...","body":"...","whenUnanswered":"...","evidence":"..."},
 "love":{"give":"service","body":"...","ask":"...","evidence":"..."},
 "values":{"top":[{"value":"...","why":"...","evidence":"..."}],"reality":"...","gap":"..."},
 "innerVoice":{"tone":"...","body":"...","beliefs":[{"belief":"...","evidence":"...","reframe":"..."}]},
 "groups":[{"role":"...","where":"...","body":"...","evidence":"..."}],
 "yearWave":{"body":"...","high":{"month":"2026-05","why":"..."},"low":{"month":"2026-02","why":"..."}},
 "circle":[{"name":"...","role":"מטעין|מרוקן|מאתגר|מעגן","why":"..."}],
 "pattern":{"title":"...","body":"..."},
 "lens":{"title":"...","body":"..."},
 "nextStep":"צעד אחד לשבוע הקרוב",
 "distress":false}
```

**Evidence for everything.** Each `evidence` is a number from summary.json ("44% מהתשובות תוך 2 דקות") or a short quote of the user's own words (up to ~12 words). Never quote other people. If the data does not support a claim, leave it out. A short honest reading beats a long flattering one: name the strength and its cost.

- **archetype** - pick the primary and secondary from these 12 keys, by what the user's own messages show most, not by what sounds nice:
  - `creator` היוצר/ת: ideas, projects, making things ("רעיון", "בניתי", "הקלטתי"), building and launching.
  - `explorer` החוקר/ת: questions, links, learning, trying new places and things, restlessness.
  - `caregiver` המטפל/ת: checking in, support, helping, "אני פה", "מה שלומך", practical care for others.
  - `warrior` הלוחם/ת: goals, training, pushing through, discipline, "יאללה", competing with themselves.
  - `leader` המנהיג/ה: opening conversations, setting times, deciding, organizing groups, taking responsibility.
  - `sage` החכם/ה: long explanations, perspective, advice, analysis, wanting to understand.
  - `rebel` המורד/ת: strong opinions, arguing, challenging rules and systems, politics with heat.
  - `magician` הקוסם/ת: vision, connecting people and ideas, "בוא נעשה את זה", turning plans into reality.
  - `everyman` החבר/ה: belonging, many groups, simple warm everyday talk, being one of the gang.
  - `jester` המצחיק/ה: humor, "חחח", playfulness, lightening heavy moments (see `style.laugh`).
  - `lover` האוהב/ת: closeness, affection, "אוהב", missing people, the intimate few (see `love.words`).
  - `innocent` התמים/ה: optimism, gratitude, faith that it will be fine, avoiding conflict.
  `tagline` is up to 7 words, personal to this user (not the generic line). `why` is 2-3 sentences. `evidence` is 2-3 items.
- **bigFive** - all five traits, `score` 1-5 (3 = middle), `body` one sentence, `evidence` one item. Markers to weigh:
  - `openness`: questions, new topics, vocabulary variety (`vocabDiversity`: 0.85+ is rich), growth and creativity talk.
  - `conscientiousness`: planning, times and dates, closing loops ("סגרתי", "בוצע"), follow-through, logistics.
  - `extraversion`: opening conversations (`relationship.initShare`), number of active chats and groups, emoji, exclamation.
  - `agreeableness`: gratitude, support, praise, "we" over "I", softening words; low = blunt, demanding, argumentative.
  - `stability`: few negative-emotion words, calm under pressure, little night rumination; low = worry, stress, reactivity.
- **faces** - 3-4 contexts (partner, family, work, close friends, groups). Group the `topChats` by who they are (from names and the sample) and compare their `style`: length, questions, emoji, laughter, positive and negative words, night share. `tone` is 2-4 words. `chats` names the chats for this context (the report stays on the user's computer). Show the shift, e.g. warm and short with family, long and precise at work.
- **relationship** - from `personality.relationship`: who opens, who gets the last word, `followUps` (writing again after 3+ hours with no answer), `unansweredShare`, reply speed both ways. `title` names the pattern in 2-5 words. `whenUnanswered` is one sentence on what the user does when the other side goes quiet.
- **love** - `give` is the strongest of words / time / service / gifts / presence, from `personality.love` (per 1,000 private messages) and the sample. `ask` is what the user asks others for, in the sample.
- **values** - 3 values that light the user up (from passion, meaning and emotion in the sample: what they get excited, proud or moved about). `reality` says where the messages actually go (`personality.topics`). `gap` is one honest sentence on the distance between the two.
- **innerVoice** - `tone` names how they talk to themselves (e.g. המבקר, הדוחף, המאמן, המרגיע, המפקפק). Build `beliefs` (2-4) from `limitingPhrases` and the sample: `belief` in first person ("אני חייב להספיק הכל"), `evidence` = count or quote, `reframe` = one practical sentence to say instead.
- **groups** - 2-4 roles from `personality.groups` and the sample: המארגן (logistics, opens), המצחיק (laugh), המפרגן (praise, support), המומחה (long answers, advice), המעדכן (links, news), השקט (writes little). `where` names the group or kind of group.
- **yearWave** - from `personality.monthly`: `high` and `low` = months with the best and worst `mood` (ignore months with under 100 messages). `why` says what the sample shows around then (topics, tone), without guessing events that are not in the messages. `body` is 2-3 sentences about the year's shape.
- **circle** - 3-6 people from `topChats` and the sample. Describe the dynamic (who initiates, reply speed, tone), not the person's character.
- **pattern** - the one pattern that ties the archetype, the traits and the numbers together. Title up to 6 words, body 2-3 sentences.
- **lens** - גבר: חברות אמיתית מול לוגיסטיקה, אוצר מילים רגשי, אבא נוכח (only with kids), האש הפנימית. אישה: העומס המנטלי, אמא ועוד (only with kids), נתינה מול קבלה. מעדיף/ה לא לציין: האיזון בין תשוקה, משמעות ועשייה. Pick the strongest 1-2 angles.
- **nextStep** - one concrete action for this week tied to the pattern (e.g. phone out of the bedroom at 23:00, answering in three set windows, one deep call with a friend).
- **distress** = `summary.distressFlag`.

Validate: `python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$OUT/insights.json"`

## 5. Build and open
```bash
python3 "$SKILL_DIR/scripts/build_report.py" "$OUT/data.json" --insights "$OUT/insights.json" --out "$OUT/report.html" --gender m --kids yes --occupation founder
open "$OUT/report.html"   # Linux: xdg-open, Windows: start
```
(Use the real answers for the three flags.)

## 6. Wrap up in chat (Hebrew, gendered, 5-7 lines)
- Where the report is: `$OUT/report.html`.
- The archetype (primary + secondary), the recovery score, the main pattern and the next step, one line each.
- The folder holds their messages in plain text (data.json, sample.md), and so does report.html: share only the card, never the file. Offer to delete the folder when they're done: `rm -rf "$OUT"`.
- Nothing was uploaded to any server. Only what Claude read in this session (the numbers and the sample) went through Claude.
- The report has a share button; the card shows only the type and numbers, never messages.
