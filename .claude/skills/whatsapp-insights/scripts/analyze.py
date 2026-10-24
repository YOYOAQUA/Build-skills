#!/usr/bin/env python3
"""Compute rhythm/circle/language/personality stats from data.json and write summary.json + sample.md.

summary.json holds numbers only (plus up to 3 short quotes per limiting phrase).
sample.md holds a time-spread sample of the user's own messages with brief context,
for Claude to read when writing insights.json. Python 3.8+ standard library only.
"""
import argparse
import ast
import datetime as dt
import json
import math
import os
import re
import statistics
import sys
from collections import defaultdict

HEB = "א-ת"
NIGHT_START, NIGHT_END = 23, 6
START_GAP_H = 6
REPLY_MAX_H = 12
FAST_REPLY_MIN = 2
TOP_CHATS = 15


def heb(pattern):
    """Whole-word Hebrew match allowing 1-2 attached prefix letters (ו, ש, ה, כ, ל, ב, מ)."""
    return re.compile(r"(?<![{0}])(?:[ושהכלבמ]{{1,2}})?(?:{1})(?![{0}])".format(HEB, pattern))


LIMITING = [
    ("אין לי זמן", heb("אין לי זמן")),
    ("אין לי כוח", heb("אין לי כו?ח")),
    ("אני לא יכול", heb("אני לא יכולה?")),
    ("אי אפשר", heb("אי אפשר")),
    ("אין מה לעשות", heb("אין מה לעשות")),
    ("זה לא בשבילי", heb("זה לא בשבילי")),
    ("קשה לי", heb("קשה לי")),
    ("אין לי ראש", heb("אין לי ראש")),
    ("לא מסתדר לי", heb("לא מסתדר לי")),
    ("אני חייב", heb("אני חייבת?")),
    ("תמיד", heb("תמיד")),
    ("אף פעם", heb("אף פעם")),
    ("I can't", re.compile(r"\bI\s+(?:can[’']?t|cannot)\b", re.I)),
    ("no time", re.compile(r"\bno\s+time\b", re.I)),
]

DISTRESS = [
    heb("להתאבד"),
    heb("לא רוצה לחיות"),
    heb("לשים סוף לחיים"),
    heb("אין טעם לחיות"),
    re.compile(r"(?<!לא )(?<![{0}])(?:[ושהכלבמ]{{1,2}})?רוצה למות(?![{0}])".format(HEB)),
]
JOKE = re.compile("מצחוק|\U0001F602|\U0001F923|חחח")

# ---------- word lists shared with the report (assets/lexicon.js) ----------

LEXICON_JS = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "lexicon.js"))
JS_STRING = r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\""
LEX_LISTS = ["positive", "negative", "gratitude", "emotion", "passion", "meaning", "creativity", "future", "past", "support"]


def load_lexicon(path=LEXICON_JS):
    """Read the word lists out of lexicon.js, so the numbers Claude reads match the report's."""
    with open(path, encoding="utf-8") as fh:
        src = fh.read()
    words = lambda body: [ast.literal_eval(s) for s in re.findall(JS_STRING, body)]
    lex = {"topics": {}}
    for key, label, terms in re.findall(r"(\w+):\s*\{\s*label:\s*'([^']*)',\s*terms:\s*\[(.*?)\]", src, re.S):
        lex["topics"][key] = {"label": label, "terms": words(terms)}
    for key in LEX_LISTS:
        found = re.search(r"\b" + key + r":\s*\[(.*?)\]", src, re.S)
        lex[key] = words(found.group(1)) if found else []
    return lex


def build_matcher(terms):
    """Same rules as buildMatcher in engine.js: Hebrew with up to 2 prefix letters and any suffix,
    Hebrew of 2 letters or less as a whole word, English as a whole word, symbols anywhere."""
    heb_long, heb_short, eng, sym = [], [], [], []
    for t in terms:
        if re.search("[א-ת]", t):
            (heb_short if len(re.sub("[^א-ת]", "", t)) <= 2 else heb_long).append(re.escape(t))
        elif re.search("[a-zA-Z]", t):
            eng.append(re.escape(t))
        else:
            sym.append(re.escape(t))
    pre = "(?:^|[^א-ת])[והבלמשכ]{0,2}"
    parts = []
    if heb_long:
        parts.append(pre + "(?:" + "|".join(heb_long) + ")")
    if heb_short:
        parts.append(pre + "(?:" + "|".join(heb_short) + ")(?![א-ת])")
    if eng:
        parts.append("(?:^|[^a-z])(?:" + "|".join(eng) + ")(?![a-z])")
    if sym:
        parts.append("(?:" + "|".join(sym) + ")")
    return re.compile("|".join(parts), re.I) if parts else re.compile(r"(?!x)x")


# ---------- personality signals (counted on the user's own text messages) ----------

EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
I_WORDS = build_matcher(["אני", "אותי", "ממני", "עליי", "אליי", "בשבילי"])
WE_WORDS = build_matcher(["אנחנו", "לנו", "שלנו", "אותנו", "ביחד", "בואו"])
# Five ways of giving love, as they show up in writing.
LOVE = {
    "words": ["אוהב אותך", "אוהבת אותך", "גאה בך", "מתגעגע", "מתגעגעת", "אין כמוך", "אין עליך", "נשמה שלי", "יקר שלי", "יקרה שלי",
              "את מדהימה", "אתה מדהים", "❤", "😍", "🥰", "😘", "💕"],
    "time": ["ניפגש", "נפגש", "נשב", "נדבר", "נצא", "נתראה", "קפה", "ארוחת", "ביחד", "בוא נ", "בואי נ", "פנוי", "פנויה"],
    "service": ["אאסוף", "אביא", "אעזור", "אסדר", "אטפל", "אקפיץ", "אסיע", "אדאג", "אבדוק לך", "אני על זה", "אכין", "אשלח לך"],
    "gifts": ["מתנה", "מתנות", "קניתי לך", "הבאתי לך", "הפתעה", "🎁", "💐"],
    "presence": ["חיבוק", "מחבק", "מחבקת", "נשיקה", "נשיקות", "אני פה", "אני איתך", "אני לידך", "🤗"],
}
PRAISE = ["כל הכבוד", "אלוף", "אלופה", "תותח", "תותחית", "מזל טוב", "גאה", "חזק", "👏", "🙌", "💪"]
FOLLOW_UP_H = 3  # writing again after 3h of no answer counts as a follow-up
MIN_MINE_FOR_RELATIONSHIP = 3  # one-on-one chats where the user wrote at least this much


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def parse_time(t):
    return dt.datetime.fromisoformat(t)


def median(values):
    return round(statistics.median(values), 1) if values else None


def share(part, whole):
    return round(part / whole, 4) if whole else 0.0


def is_distress(text):
    return bool(text) and any(p.search(text) for p in DISTRESS) and not JOKE.search(text)


def quote(text, match, width=80):
    start = max(0, match.start() - width // 2)
    snippet = text[start:start + width].replace("\n", " ").strip()
    if start > 0:
        snippet = "..." + snippet
    if start + width < len(text):
        snippet += "..."
    return snippet


def chat_stats(chat):
    msgs = chat["messages"]
    times = [parse_time(m["t"]) for m in msgs]
    mine_reply, their_reply = [], []
    starts_me = starts_them = 0
    for i, m in enumerate(msgs):
        gap_h = None if i == 0 else (times[i] - times[i - 1]).total_seconds() / 3600
        if gap_h is None or gap_h > START_GAP_H:
            if m["me"]:
                starts_me += 1
            else:
                starts_them += 1
        if gap_h is not None and gap_h <= REPLY_MAX_H and m["me"] != msgs[i - 1]["me"]:
            (mine_reply if m["me"] else their_reply).append(gap_h * 60)
    return {
        "times": times,
        "myReplies": mine_reply,
        "theirReplies": their_reply,
        "startsByMe": starts_me,
        "startsByThem": starts_them,
    }


def my_texts(chat):
    return [m["x"] for m in chat["messages"] if m["me"] and not m["media"] and m["x"]]


def style_of(texts, M, keys=None):
    """Share of the user's text messages that carry each signal, plus average length."""
    keys = keys or ["question", "exclaim", "emoji", "laugh", "long", "short", "i", "we"] + LEX_LISTS
    counts, words = defaultdict(int), 0
    for x in texts:
        w = len(x.split())
        words += w
        signals = {
            "question": "?" in x, "exclaim": "!" in x, "emoji": bool(EMOJI.search(x)), "laugh": bool(JOKE.search(x)),
            "long": w >= 25, "short": w <= 2,
        }
        for k in keys:
            if k in signals:
                counts[k] += signals[k]
            elif k == "i":
                counts[k] += bool(I_WORDS.search(x))
            elif k == "we":
                counts[k] += bool(WE_WORDS.search(x))
            else:
                counts[k] += bool(M[k].search(x))
    out = {k: share(counts[k], len(texts)) for k in keys}
    out["avgWords"] = round(words / len(texts), 1) if texts else 0
    return out


def vocab_diversity(texts, window=50, limit=40000):
    """Unique words per 50-word window, averaged. Comparable between people, unlike a raw count."""
    toks = []
    for x in texts:
        toks.extend(w.lower() for w in re.findall(r"[א-תa-zA-Z]+", x))
        if len(toks) >= limit:
            break
    if len(toks) < window:
        return None
    vals = [len(set(toks[i:i + window])) / window for i in range(0, len(toks) - window + 1, window)]
    return round(sum(vals) / len(vals), 3)


def relationship(chats, per_chat):
    """How the user behaves one on one: who opens, who has the last word, writing again when unanswered."""
    sessions = starts_me = last_me = follow = unanswered = them_started = 0
    mine, theirs = [], []
    for chat, st in zip(chats, per_chat):
        msgs, times = chat["messages"], st["times"]
        # Businesses, bots and one-off senders the user never really talks to would skew who opens and who answers.
        if chat["type"] != "private" or sum(1 for m in msgs if m["me"]) < MIN_MINE_FOR_RELATIONSHIP:
            continue
        mine += st["myReplies"]
        theirs += st["theirReplies"]
        convs = []
        for i, m in enumerate(msgs):
            gap_h = None if i == 0 else (times[i] - times[i - 1]).total_seconds() / 3600
            if gap_h is None or gap_h > START_GAP_H:
                convs.append([])
            convs[-1].append(m["me"])
            if m["me"] and i > 0 and msgs[i - 1]["me"] and gap_h is not None and FOLLOW_UP_H <= gap_h <= 72:
                follow += 1
        for c in convs:
            sessions += 1
            if c[0]:
                starts_me += 1
            else:
                them_started += 1
                unanswered += not any(c)
            last_me += c[-1]
    return {
        "conversations": sessions,
        "initShare": share(starts_me, sessions),
        "lastWordShare": share(last_me, sessions),
        "followUps": follow,
        "followUpsPer100": round(100 * follow / sessions, 1) if sessions else 0,
        "unansweredShare": share(unanswered, them_started),
        "myMedianReplyMin": median(mine),
        "theirMedianReplyMin": median(theirs),
    }


def personality(chats, per_chat, lex):
    """The numbers behind the personality angles in insights.json. All from the user's own messages."""
    M = {k: build_matcher(lex[k]) for k in LEX_LISTS}
    T = {k: build_matcher(v["terms"]) for k, v in lex["topics"].items()}
    texts = [x for c in chats for x in my_texts(c)]
    private = [x for c in chats if c["type"] == "private" for x in my_texts(c)]

    love_re = {k: build_matcher(v) for k, v in LOVE.items()}
    love = {k: {"count": sum(1 for x in private if r.search(x))} for k, r in love_re.items()}
    for v in love.values():
        v["per1000"] = round(1000 * v["count"] / len(private), 1) if private else 0

    praise, logistics = build_matcher(PRAISE), T.get("logistics")
    groups = []
    for chat, st in zip(chats, per_chat):
        tx = my_texts(chat)
        if chat["type"] != "group" or len(tx) < 15:
            continue
        mine = sum(1 for m in chat["messages"] if m["me"])
        opened = st["startsByMe"] + st["startsByThem"]
        groups.append({
            "name": chat["name"], "mine": mine, "myShare": share(mine, len(chat["messages"])),
            "opensShare": share(st["startsByMe"], opened),
            "question": share(sum("?" in x for x in tx), len(tx)),
            "logistics": share(sum(bool(logistics and logistics.search(x)) for x in tx), len(tx)),
            "laugh": share(sum(bool(JOKE.search(x)) for x in tx), len(tx)),
            "praise": share(sum(bool(praise.search(x)) for x in tx), len(tx)),
            "support": share(sum(bool(M["support"].search(x)) for x in tx), len(tx)),
            "avgWords": round(sum(len(x.split()) for x in tx) / len(tx), 1),
        })
    groups.sort(key=lambda g: -g["mine"])

    months = defaultdict(lambda: {"mine": 0, "night": 0, "texts": [], "chats": set()})
    for chat, st in zip(chats, per_chat):
        for m, t in zip(chat["messages"], st["times"]):
            if not m["me"]:
                continue
            b = months[t.strftime("%Y-%m")]
            b["mine"] += 1
            b["night"] += t.hour >= NIGHT_START or t.hour < NIGHT_END
            b["chats"].add(chat["name"])
            if not m["media"] and m["x"]:
                b["texts"].append(m["x"])
    monthly = []
    for key in sorted(months):
        b = months[key]
        pos = share(sum(bool(M["positive"].search(x)) for x in b["texts"]), len(b["texts"]))
        neg = share(sum(bool(M["negative"].search(x)) for x in b["texts"]), len(b["texts"]))
        monthly.append({
            "month": key, "mine": b["mine"], "chats": len(b["chats"]), "nightShare": share(b["night"], b["mine"]),
            "positive": pos, "negative": neg, "mood": round(pos - neg, 4),
            "avgWords": round(sum(len(x.split()) for x in b["texts"]) / len(b["texts"]), 1) if b["texts"] else 0,
        })

    return {
        "style": style_of(texts, M),
        "vocabDiversity": vocab_diversity(texts),
        "topics": {k: {"label": v["label"], "share": share(sum(bool(T[k].search(x)) for x in texts), len(texts))}
                   for k, v in lex["topics"].items()},
        "relationship": relationship(chats, per_chat),
        "love": love,
        "groups": groups[:10],
        "monthly": monthly,
    }


def face_of(chat, st, M):
    """How the user writes in one chat, for the "faces" angle."""
    tx = my_texts(chat)
    mine_t = [t for m, t in zip(chat["messages"], st["times"]) if m["me"]]
    face = style_of(tx, M, ["question", "emoji", "laugh", "long", "positive", "negative"])
    face["nightShare"] = share(sum(1 for t in mine_t if t.hour >= NIGHT_START or t.hour < NIGHT_END), len(mine_t))
    return face


def summarize(data, lex=None):
    chats = data["chats"]
    per_chat = [chat_stats(c) for c in chats]
    lex = lex or load_lexicon()
    face_m = {k: build_matcher(lex[k]) for k in ("positive", "negative")}

    my_times, my_text = [], []
    for chat, st in zip(chats, per_chat):
        for m, t in zip(chat["messages"], st["times"]):
            if m["me"]:
                my_times.append(t)
                if not m["media"] and m["x"]:
                    my_text.append(m["x"])
    my_total = len(my_times)

    hours = [0] * 24
    weekdays = [0] * 7  # Sun..Sat
    late_dates = set()
    night = sat = 0
    for t in my_times:
        hours[t.hour] += 1
        weekdays[(t.weekday() + 1) % 7] += 1
        if t.hour >= NIGHT_START or t.hour < NIGHT_END:
            night += 1
        if t.hour < 5:
            late_dates.add(t.date())
        if t.weekday() == 5:
            sat += 1

    span_days = 7.0
    if my_times:
        span_days = max(7.0, (max(my_times) - min(my_times)).total_seconds() / 86400)
    late_per_week = len(late_dates) / max(1.0, span_days / 7)

    my_replies = [g for st in per_chat for g in st["myReplies"]]
    their_replies = [g for st in per_chat for g in st["theirReplies"]]
    fast = sum(1 for g in my_replies if g <= FAST_REPLY_MIN)

    night_share = share(night, my_total)
    fast_share = share(fast, len(my_replies))
    sat_share = share(sat, my_total)
    score = 100 - min(35, night_share * 140) - min(25, fast_share * 50)
    score -= min(15, max(0.0, sat_share - 1 / 7) * 150) + min(25, late_per_week * 6)
    score = int(round(max(0, min(100, score))))
    band = "נמוך" if score < 40 else "בינוני" if score < 70 else "גבוה"

    top = []
    for chat, st in sorted(zip(chats, per_chat), key=lambda p: len(p[0]["messages"]), reverse=True)[:TOP_CHATS]:
        total = len(chat["messages"])
        mine = sum(1 for m in chat["messages"] if m["me"])
        top.append(
            {
                "name": chat["name"],
                "type": chat["type"],
                "total": total,
                "mine": mine,
                "myShare": share(mine, total),
                "myMedianReplyMin": median(st["myReplies"]),
                "theirMedianReplyMin": median(st["theirReplies"]),
                "startsByMe": st["startsByMe"],
                "startsByThem": st["startsByThem"],
                "style": face_of(chat, st, face_m),
            }
        )

    limiting = []
    for phrase, pattern in LIMITING:
        count, examples = 0, []
        for text in my_text:
            match = pattern.search(text)
            if match and not is_distress(text):
                count += 1
                snippet = quote(text, match)
                if len(examples) < 3 and snippet not in examples:
                    examples.append(snippet)
        limiting.append({"phrase": phrase, "count": count, "examples": examples})
    limiting.sort(key=lambda r: -r["count"])

    all_msgs = sum(len(c["messages"]) for c in chats)
    my_media = sum(1 for c in chats for m in c["messages"] if m["me"] and m["media"])
    words = [len(x.split()) for x in my_text]
    return {
        "generatedAt": data.get("generatedAt"),
        "source": data.get("source"),
        "me": data.get("me"),
        "range": data.get("range"),
        "totals": {
            "chats": len(chats),
            "groups": sum(1 for c in chats if c["type"] == "group"),
            "private": sum(1 for c in chats if c["type"] == "private"),
            "messages": all_msgs,
            "mine": my_total,
            "theirs": all_msgs - my_total,
            "myMedia": my_media,
            "myAvgWords": round(sum(words) / len(words), 1) if words else 0,
        },
        "hourHistogram": hours,
        "weekdayHistogram": weekdays,
        "weekdayOrder": ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
        "nightShare": night_share,
        "fastShare": fast_share,
        "satShare": sat_share,
        "lateDays": len(late_dates),
        "spanDays": round(span_days, 1),
        "lateDaysPerWeek": round(late_per_week, 2),
        "recoveryScore": score,
        "recoveryBand": band,
        "myReplies": len(my_replies),
        "myMedianReplyMin": median(my_replies),
        "theirMedianReplyMin": median(their_replies),
        "conversationStarts": {
            "byMe": sum(st["startsByMe"] for st in per_chat),
            "byThem": sum(st["startsByThem"] for st in per_chat),
        },
        "topChats": top,
        "limitingPhrases": limiting,
        "distressFlag": any(is_distress(x) for x in my_text),
        "personality": personality(chats, per_chat, lex),
    }


def clip(text, n):
    text = " ".join(text.split())
    return text if len(text) <= n else text[: n - 1] + "…"


def allocate(counts, budget):
    """Split budget across chats by sqrt(size), never above what a chat has."""
    alloc = [0] * len(counts)
    remaining = budget
    open_idx = [i for i, n in enumerate(counts) if n > 0]
    while remaining > 0 and open_idx:
        weights = {i: math.sqrt(counts[i]) for i in open_idx}
        total_w = sum(weights.values())
        given = 0
        for i in open_idx:
            want = max(1, int(remaining * weights[i] / total_w))
            take = min(want, counts[i] - alloc[i])
            alloc[i] += take
            given += take
        remaining = budget - sum(alloc)
        open_idx = [i for i in open_idx if alloc[i] < counts[i]]
        if given == 0:
            break
    return alloc


def build_sample(data, max_messages, max_chars):
    chats = [c for c in data["chats"]]
    cands = []
    for c in chats:
        idx = [
            i
            for i, m in enumerate(c["messages"])
            if m["me"] and not m["media"] and len(m["x"].strip()) >= 3 and not is_distress(m["x"])
        ]
        cands.append(idx)
    order = sorted(range(len(chats)), key=lambda i: -len(cands[i]))[:30]

    budget = max_messages
    while True:
        alloc = allocate([len(cands[i]) for i in order], budget)
        parts, picked = [], 0
        for slot, ci in enumerate(order):
            k = alloc[slot]
            if k <= 0:
                continue
            chat, idx = chats[ci], cands[ci]
            chosen = sorted({idx[int(j * len(idx) / k)] for j in range(k)})
            mine = sum(1 for m in chat["messages"] if m["me"])
            lines = ["", "## {} ({}, {} הודעות שלי מתוך {})".format(
                chat["name"], "קבוצה" if chat["type"] == "group" else "פרטי", mine, len(chat["messages"]))]
            for i in chosen:
                context = []
                j = i - 1
                while j >= 0 and len(context) < 2 and not chat["messages"][j]["me"]:
                    prev = chat["messages"][j]
                    if not is_distress(prev["x"]):
                        body = "[מדיה]" if prev["media"] else clip(prev["x"], 160)
                        context.append("> {}: {}".format(prev["s"], body))
                    j -= 1
                lines.extend(reversed(context))
                m = chat["messages"][i]
                lines.append("[{} {}] אני: {}".format(m["t"][:10], m["t"][11:16], clip(m["x"], 280)))
                picked += 1
            parts.append("\n".join(lines))
        body = "\n".join(parts)
        if len(body) <= max_chars or budget <= 50:
            return body, picked
        budget = int(budget * 0.8)


HEADER = """# WhatsApp sample - the user's own messages

Lines `[date time] אני: ...` are the user's messages. Lines starting with `>` are up to 2
messages from others that came right before, for context. Sampled evenly over time across
the most active chats. Messages with distress phrases are excluded. Use only for writing
insights.json - quote briefly, never paste long passages back to the user.
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("data")
    parser.add_argument("--out-dir", default=".")
    parser.add_argument("--max-messages", type=int, default=1500)
    parser.add_argument("--max-chars", type=int, default=120000)
    args = parser.parse_args()

    data = load(args.data)
    if not data.get("chats"):
        print("data.json has no chats", file=sys.stderr)
        sys.exit(1)
    summary = summarize(data)
    sample, picked = build_sample(data, args.max_messages, args.max_chars)
    summary["sampleMessages"] = picked

    os.makedirs(args.out_dir, exist_ok=True)
    with open(os.path.join(args.out_dir, "summary.json"), "w", encoding="utf-8") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=2)
    with open(os.path.join(args.out_dir, "sample.md"), "w", encoding="utf-8") as fh:
        fh.write(HEADER + sample + "\n")

    print(
        "OK: {} of my messages, recovery {} ({}), night {:.0%}, fast replies {:.0%}, sample {} msgs{}".format(
            summary["totals"]["mine"],
            summary["recoveryScore"],
            summary["recoveryBand"],
            summary["nightShare"],
            summary["fastShare"],
            picked,
            ", DISTRESS FLAG" if summary["distressFlag"] else "",
        )
    )


if __name__ == "__main__":
    main()
