#!/usr/bin/env python3
"""Extract WhatsApp Desktop (macOS) chats into the normalized data.json format.

Works on a temporary copy of ChatStorage.sqlite and never prints message content.
Python 3.8+ standard library only (runs on macOS system python3).

Exit codes: 0 ok, 1 database not found, 2 unexpected schema, 3 permission denied.
"""
import argparse
import datetime as dt
import errno
import json
import os
import shutil
import sqlite3
import sys
import tempfile

DEFAULT_DB = os.path.expanduser(
    "~/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite"
)
COCOA_EPOCH = 978307200  # seconds between 1970-01-01 and 2001-01-01 (UTC)
MAX_TEXT = 1000

# ZMESSAGETYPE values that are attachments (image, video, audio, contact, location,
# document, gif, sticker). With no caption they become media:true.
MEDIA_TYPES = {1, 2, 3, 4, 5, 8, 11, 15}
# Group events, calls, deleted messages and other system rows - always skipped.
SYSTEM_TYPES = {6, 10, 14}

REQUIRED = {
    "ZWAMESSAGE": ["ZISFROMME", "ZMESSAGEDATE", "ZTEXT", "ZCHATSESSION"],
    "ZWACHATSESSION": ["Z_PK", "ZCONTACTJID"],
}

PERMISSION_MSG = """\
אין הרשאה לקרוא את הנתונים של וואטסאפ.
macOS חוסם גישה לנתונים של אפליקציות אחרות. כדי לאשר:
  1. אם קפץ חלון "would like to access data from other apps" - לחץ Allow ונסה שוב.
  2. אחרת: הגדרות המערכת > פרטיות ואבטחה > גישה מלאה לדיסק (Full Disk Access),
     והפעל את האפליקציה שמריצה את Claude (Terminal / iTerm / Claude). אחר כך הפעל אותה מחדש.

Permission denied reading WhatsApp data.
macOS protects other apps' data. Fix:
  1. If a prompt "... would like to access data from other apps" appeared, click Allow and retry.
  2. Otherwise: System Settings > Privacy & Security > Full Disk Access, enable the app
     running Claude (Terminal / iTerm / Claude), then restart that app."""


def is_permission_error(exc):
    if isinstance(exc, PermissionError):
        return True
    if isinstance(exc, OSError) and exc.errno in (errno.EPERM, errno.EACCES):
        return True
    return "operation not permitted" in str(exc).lower()


def copy_db(src, workdir):
    dst = os.path.join(workdir, "ChatStorage.sqlite")
    shutil.copy2(src, dst)
    for suffix in ("-wal", "-shm"):
        if os.path.exists(src + suffix):
            shutil.copy2(src + suffix, dst + suffix)
    return dst


def connect(path):
    try:
        conn = sqlite3.connect("file:{}?mode=ro".format(path), uri=True)
        conn.execute("SELECT count(*) FROM sqlite_master").fetchone()
        return conn
    except sqlite3.OperationalError:
        # A WAL database may need to write its -shm file even for reads. This is a
        # private temporary copy, so a normal connection is safe.
        return sqlite3.connect(path)


def schema(conn):
    tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    return {t: [r[1] for r in conn.execute('PRAGMA table_info("{}")'.format(t))] for t in tables}


def print_schema(cols):
    print("Unexpected WhatsApp database schema. Tables and columns:", file=sys.stderr)
    for table in sorted(cols):
        if not table.startswith("sqlite_"):
            print("  {}: {}".format(table, ", ".join(cols[table])), file=sys.stderr)


def text(value):
    if value is None:
        return None
    if isinstance(value, bytes):
        value = value.decode("utf-8", "replace")
    value = str(value).strip()
    return value or None


def phone(jid):
    if not jid:
        return None
    user = str(jid).split("@")[0].split(":")[0]
    return "+" + user if user.isdigit() else user


def opt(cols, table, col, alias):
    return "{}.{}".format(alias, col) if col in cols.get(table, []) else "NULL"


def extract(db_path, months, me_name):
    with tempfile.TemporaryDirectory(prefix="wa-insights-") as workdir:
        conn = connect(copy_db(db_path, workdir))
        try:
            return read_chats(conn, months, me_name)
        finally:
            conn.close()


def read_chats(conn, months, me_name):
    cols = schema(conn)
    missing = [
        "{}.{}".format(t, c)
        for t, needed in REQUIRED.items()
        for c in needed
        if c not in cols.get(t, [])
    ]
    if missing:
        print("Missing: " + ", ".join(missing), file=sys.stderr)
        print_schema(cols)
        sys.exit(2)

    push = {}
    if "ZWAPROFILEPUSHNAME" in cols and {"ZJID", "ZPUSHNAME"} <= set(cols["ZWAPROFILEPUSHNAME"]):
        for jid, name in conn.execute("SELECT ZJID, ZPUSHNAME FROM ZWAPROFILEPUSHNAME"):
            if jid and text(name):
                push[jid] = text(name)

    members = {}
    if "ZWAGROUPMEMBER" in cols and "Z_PK" in cols["ZWAGROUPMEMBER"]:
        q = "SELECT g.Z_PK, {}, {}, {} FROM ZWAGROUPMEMBER g".format(
            opt(cols, "ZWAGROUPMEMBER", "ZMEMBERJID", "g"),
            opt(cols, "ZWAGROUPMEMBER", "ZCONTACTNAME", "g"),
            opt(cols, "ZWAGROUPMEMBER", "ZFIRSTNAME", "g"),
        )
        for pk, jid, contact, first in conn.execute(q):
            members[pk] = text(contact) or text(first) or push.get(jid) or phone(jid)

    sessions = {}
    q = "SELECT c.Z_PK, c.ZCONTACTJID, {}, {} FROM ZWACHATSESSION c".format(
        opt(cols, "ZWACHATSESSION", "ZPARTNERNAME", "c"),
        opt(cols, "ZWACHATSESSION", "ZSESSIONTYPE", "c"),
    )
    for pk, jid, partner, stype in conn.execute(q):
        jid = text(jid) or ""
        if not jid or "broadcast" in jid or jid.startswith("status"):
            continue
        is_group = jid.endswith("@g.us") or stype == 1
        name = text(partner) or push.get(jid) or phone(jid) or "צ'אט"
        sessions[pk] = {"jid": jid, "name": name, "group": is_group}

    since = None
    if months and months > 0:
        cutoff = dt.datetime.now() - dt.timedelta(days=months * 30.44)
        since = cutoff.timestamp() - COCOA_EPOCH

    q = "SELECT m.ZCHATSESSION, m.ZISFROMME, m.ZMESSAGEDATE, m.ZTEXT, {}, {}, {} FROM ZWAMESSAGE m".format(
        opt(cols, "ZWAMESSAGE", "ZMESSAGETYPE", "m"),
        opt(cols, "ZWAMESSAGE", "ZGROUPMEMBER", "m"),
        opt(cols, "ZWAMESSAGE", "ZFROMJID", "m"),
    )
    params = []
    q += " WHERE m.ZMESSAGEDATE IS NOT NULL"
    if since is not None:
        q += " AND m.ZMESSAGEDATE >= ?"
        params.append(since)
    q += " ORDER BY m.ZCHATSESSION, m.ZMESSAGEDATE"
    if "Z_PK" in cols["ZWAMESSAGE"]:
        q += ", m.Z_PK"

    by_chat = {}
    for chat_pk, from_me, date, body, mtype, member_pk, from_jid in conn.execute(q, params):
        session = sessions.get(chat_pk)
        if session is None:
            continue
        mtype = mtype if isinstance(mtype, int) else 0
        if mtype in SYSTEM_TYPES:
            continue
        body = text(body)
        media = False
        if body is None:
            if mtype not in MEDIA_TYPES:
                continue
            media = True
            body = ""
        me = bool(from_me)
        if me:
            sender = me_name
        elif session["group"]:
            sender = members.get(member_pk) or push.get(from_jid) or phone(from_jid) or "לא ידוע"
        else:
            sender = session["name"]
        try:
            when = dt.datetime.fromtimestamp(float(date) + COCOA_EPOCH)
        except (OverflowError, OSError, ValueError):
            continue
        by_chat.setdefault(chat_pk, []).append(
            {
                "t": when.isoformat(timespec="seconds"),
                "s": sender,
                "me": me,
                "x": body[:MAX_TEXT],
                "media": media,
            }
        )

    chats, seen = [], {}
    for chat_pk, messages in by_chat.items():
        session = sessions[chat_pk]
        messages.sort(key=lambda m: m["t"])
        name = session["name"]
        seen[name] = seen.get(name, 0) + 1
        if seen[name] > 1:
            name = "{} ({})".format(name, seen[name])
        chats.append({"name": name, "type": "group" if session["group"] else "private", "messages": messages})
    chats.sort(key=lambda c: len(c["messages"]), reverse=True)
    return chats


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--db", default=DEFAULT_DB, help="path to ChatStorage.sqlite")
    parser.add_argument("--months", type=int, default=12, help="months of history (0 = all)")
    parser.add_argument("--me-name", default="אני", help="label for your own messages")
    parser.add_argument("--out", default="data.json")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(
            "לא נמצא מסד הנתונים של וואטסאפ דסקטופ: {}\n"
            "WhatsApp Desktop database not found. Is the native WhatsApp app for Mac installed and logged in?".format(args.db),
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        chats = extract(args.db, args.months, args.me_name)
    except (OSError, sqlite3.Error) as exc:
        if is_permission_error(exc) or "unable to open" in str(exc).lower():
            print(PERMISSION_MSG, file=sys.stderr)
            sys.exit(3)
        raise

    dates = [m["t"][:10] for c in chats for m in c["messages"]]
    data = {
        "version": 1,
        "source": "mac-db",
        "generatedAt": dt.datetime.now().isoformat(timespec="seconds"),
        "me": args.me_name,
        "range": {"from": min(dates) if dates else None, "to": max(dates) if dates else None},
        "chats": chats,
    }
    out_dir = os.path.dirname(os.path.abspath(args.out))
    os.makedirs(out_dir, exist_ok=True)
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
