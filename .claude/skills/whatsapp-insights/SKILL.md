---
name: whatsapp-insights
description: Analyze the user's own WhatsApp chats locally and build a private Hebrew dashboard - digital recovery score, rhythm, circle, language, limiting beliefs, passion and meaning - with AI insights. Reads WhatsApp Desktop for Mac directly (all chats at once), or WhatsApp "Export chat" files on any computer. Use when the user says "תנתח את הוואטסאפ שלי", "מה הוואטסאפ שלי יודע עליי", "ציון התאוששות דיגיטלית", "analyze my WhatsApp", "WhatsApp insights", or shares a WhatsApp chat export.
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

## 4. Write insights.json
Read all of `$OUT/sample.md` (in chunks if long). Write `$OUT/insights.json`, all strings in Hebrew:
```json
{"pattern":{"title":"...","body":"..."},
 "insights":[{"layer":"קצב|מעגל|תוכן|שפה|תשוקה ומשמעות","title":"...","body":"...","evidence":"מספר או ציטוט קצר"}],
 "limitingBeliefs":[{"belief":"...","evidence":"...","reframe":"..."}],
 "circle":[{"name":"...","role":"מטעין|מרוקן|מאתגר|מעגן","why":"..."}],
 "lens":{"title":"...","body":"..."},
 "nextStep":"צעד אחד לשבוע הקרוב",
 "distress":false}
```
- **pattern** - the one pattern that ties the numbers together. Title up to 6 words, body 2-3 sentences.
- **insights** - 6-10 items, covering all five layers. Topics in תוכן: work, family, growth, politics, news, complaints, health.
- **limitingBeliefs** - 2-4, built from `limitingPhrases` + the sample. `belief` in first person ("אין לי זמן לעצמי"), `evidence` = count or quote, `reframe` = one practical sentence.
- **circle** - 3-6 people from `topChats` and the sample. Describe the dynamic (who initiates, reply speed, tone), not the person's character.
- **lens** - גבר: חברות אמיתית מול לוגיסטיקה, אוצר מילים רגשי, אבא נוכח (only with kids), האש הפנימית. אישה: העומס המנטלי, אמא ועוד (only with kids), נתינה מול קבלה. מעדיף/ה לא לציין: האיזון בין תשוקה, משמעות ועשייה. Pick the strongest 1-2 angles.
- **nextStep** - one concrete action for this week tied to the pattern (e.g. phone out of the bedroom at 23:00, two minutes of breathing before answering, one deep call with a friend).
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
- Recovery score + the main pattern + the next step, one line each.
- The folder holds their messages in plain text (data.json, sample.md). Offer to delete it when they're done: `rm -rf "$OUT"`.
- Nothing was uploaded to any server. Only what Claude read in this session (the numbers and the sample) went through Claude.
- The report has a share button; the card shows only the type and numbers, never messages.
