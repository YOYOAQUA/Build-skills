#!/usr/bin/env python3
"""Parse WhatsApp "Export chat" files (.txt or .zip) into the normalized data.json format.

Handles iPhone and Android exports in Hebrew and English, 12h/24h clocks, DMY/MDY dates.
Python 3.8+ standard library only. Never prints message content.

Exit codes: 0 ok, 1 bad input, 4 --me missing or not found (participants are printed).
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import zipfile

MAX_TEXT = 1000
INVISIBLE = "‎‏‪‫‬‭‮﻿⁦⁧⁨⁩"

DATE = r"(\d{1,4})[./-](\d{1,2})[./-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?|לפנה[\"״]צ|אחה[\"״]צ)?"
IOS = re.compile(r"^\[" + DATE + r"\]\s(.*)$")
ANDROID = re.compile(r"^" + DATE + r"\s[-–]\s(.*)$")
SENDER = re.compile(r"^(.+?):\s(.*)$", re.S)

MEDIA = re.compile(
    r"^(?:<media omitted>|<המדיה הושמטה>|<מדיה הושמטה>|<attached: .*>|"
    r"(?:image|video|audio|sticker|gif|document|contact card|voice message) omitted|"
    r"(?:תמונה|מדבקה|הודעה קולית) הושמטה|(?:סרטון|שמע|מסמך|קובץ|כרטיס איש קשר|קובץ GIF|GIF) הושמט|"
    r".+\.(?:jpg|jpeg|png|webp|mp4|opus|pdf) \((?:file attached|קובץ מצורף)\))$",
    re.I,
)
DELETED = re.compile(
    r"^(?:this message was deleted\.?|you deleted this message\.?|הודעה זו נמחקה|ההודעה נמחקה|מחקת את ההודעה הזו)$",
    re.I,
)
SYSTEM = re.compile(
    r"(end-to-end encrypted|מוצפנות מקצה לקצה|created group|יצר/ה את הקבוצה|יצר את הקבוצה|"
    r"\badded\b|הוסיף/ה|הוסיף את|\bleft\b|יצא/ה|\bremoved\b|הסיר/ה|changed the subject|"
    r"changed this group|שינה/תה את|joined using|הצטרף/ה|missed (?:voice|video) call|שיחה שלא נענתה|"
    r"security code changed|קוד האבטחה)",
    re.I,
)
NAME_PREFIXES = (
    "WhatsApp Chat with ",
    "WhatsApp Chat - ",
    "צ'אט WhatsApp עם ",
    "צ׳אט WhatsApp עם ",
    "צ'אט ב-WhatsApp עם ",
    "צ׳אט ב-WhatsApp עם ",
)


def clean(s):
    s = s.replace(" ", " ").replace(" ", " ")
    return s.strip(INVISIBLE + " \r")


def read_sources(path):
    """Yield (chat_name, text) for a .txt or every .txt inside a .zip."""
    base = os.path.splitext(os.path.basename(path))[0]
    if path.lower().endswith(".zip"):
        with zipfile.ZipFile(path) as zf:
            names = [n for n in zf.namelist() if n.lower().endswith(".txt") and not n.startswith("__MACOSX")]
            for n in names:
                inner = os.path.splitext(os.path.basename(n))[0]
                label = base if inner in ("_chat", "") else inner
                yield chat_name(label), zf.read(n).decode("utf-8-sig", "replace")
    else:
        with open(path, encoding="utf-8-sig", errors="replace") as fh:
            yield chat_name(base), fh.read()


def chat_name(label):
    for p in NAME_PREFIXES:
        if label.startswith(p):
            return label[len(p):].strip() or label
    return label


def scan(raw):
    """Return list of (fields tuple, rest, had_line_lrm) headers and continuation lines."""
    rows = []
    for line in raw.splitlines():
        stripped = clean(line)
        m = IOS.match(stripped) or ANDROID.match(stripped)
        if m:
            rows.append(("msg", m.groups()))
        elif rows:
            rows.append(("cont", line.rstrip("\r")))
    return rows


def date_order(rows):
    first_big = second_big = False
    for kind, g in rows:
        if kind != "msg" or len(g[0]) == 4:
            continue
        a, b = int(g[0]), int(g[1])
        first_big |= a > 12
        second_big |= b > 12
    if first_big:
        return "dmy"
    return "mdy" if second_big else "dmy"


def to_datetime(g, order):
    a, b, c, hh, mm, ss, ampm = g
    if len(a) == 4:
        year, month, day = int(a), int(b), int(c)
    elif order == "mdy":
        month, day, year = int(a), int(b), int(c)
    else:
        day, month, year = int(a), int(b), int(c)
    if year < 100:
        year += 2000
    hour = int(hh)
    if ampm:
        pm = ampm.lower().startswith("p") or ampm.startswith("אחה")
        hour = (hour % 12) + (12 if pm else 0)
    return dt.datetime(year, month, day, hour, int(mm), int(ss or 0))


def parse_chat(name, raw):
    rows = scan(raw)
    order = date_order(rows)
    messages = []
    current = None
    for kind, val in rows:
        if kind == "cont":
            if current is not None and not current.get("skip"):
                current["x"] += "\n" + val
            continue
        g = val
        rest = g[7]
        sm = SENDER.match(rest)
        if not sm:
            current = {"skip": True}
            continue
        sender, body = clean(sm.group(1)), sm.group(2)
        lrm_body = body.startswith("‎")
        body = clean(body)
        try:
            when = to_datetime(g[:7], order)
        except ValueError:
            current = {"skip": True}
            continue
        media = bool(MEDIA.match(body))
        if not media and (DELETED.match(body) or (lrm_body and SYSTEM.search(body))):
            current = {"skip": True}
            continue
        if not media and lrm_body and not body:
            current = {"skip": True}
            continue
        current = {"t": when.isoformat(timespec="seconds"), "s": sender, "x": "" if media else body, "media": media}
        messages.append(current)
    for m in messages:
        m["x"] = m["x"].strip()[:MAX_TEXT]
        if m["media"] and m["x"]:
            m["media"] = False  # attachment with a caption counts as text
    return messages


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("files", nargs="+", help=".txt or .zip WhatsApp exports")
    parser.add_argument("--me", action="append", default=[], help="your name as it appears in the chat (repeatable)")
    parser.add_argument("--out", default="data.json")
    args = parser.parse_args()

    chats = []
    for path in args.files:
        if not os.path.exists(path):
            print("File not found: {}".format(path), file=sys.stderr)
            sys.exit(1)
        try:
            for name, raw in read_sources(path):
                messages = parse_chat(name, raw)
                if messages:
                    chats.append({"name": name, "messages": messages})
        except zipfile.BadZipFile:
            print("Not a valid zip: {}".format(path), file=sys.stderr)
            sys.exit(1)

    if not chats:
        print("No messages found. Is this a WhatsApp 'Export chat' file?", file=sys.stderr)
        sys.exit(1)

    counts = {}
    for c in chats:
        for m in c["messages"]:
            counts[m["s"]] = counts.get(m["s"], 0) + 1
    wanted = {n.strip().casefold() for n in args.me if n.strip()}
    found = {s for s in counts if s.casefold() in wanted}
    if not found:
        print("PARTICIPANTS (pick yours and rerun with --me \"Name\"):")
        for s, n in sorted(counts.items(), key=lambda kv: -kv[1]):
            print("  {}  ({} messages)".format(s, n))
        sys.exit(4)

    me_label = args.me[0].strip()
    for c in chats:
        senders = {m["s"] for m in c["messages"]}
        c["type"] = "group" if len(senders - found) > 1 else "private"
        for m in c["messages"]:
            m["me"] = m["s"] in found
            if m["me"]:
                m["s"] = me_label
            m.pop("skip", None)
        c["messages"].sort(key=lambda m: m["t"])
        c["messages"] = [
            {"t": m["t"], "s": m["s"], "me": m["me"], "x": m["x"], "media": m["media"]} for m in c["messages"]
        ]
    chats.sort(key=lambda c: len(c["messages"]), reverse=True)

    dates = [m["t"][:10] for c in chats for m in c["messages"]]
    data = {
        "version": 1,
        "source": "export",
        "generatedAt": dt.datetime.now().isoformat(timespec="seconds"),
        "me": me_label,
        "range": {"from": min(dates), "to": max(dates)},
        "chats": [{"name": c["name"], "type": c["type"], "messages": c["messages"]} for c in chats],
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
    mine = sum(1 for c in chats for m in c["messages"] if m["me"])
    print(
        "OK: {} chats, {} messages ({} mine), {} -> {}. Saved to {}".format(
            len(chats), len(dates), mine, data["range"]["from"], data["range"]["to"], args.out
        )
    )


if __name__ == "__main__":
    main()
