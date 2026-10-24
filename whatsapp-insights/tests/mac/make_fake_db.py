#!/usr/bin/env python3
"""Build a fake WhatsApp Desktop ChatStorage.sqlite (Core Data schema subset) for tests.

Usage: python3 make_fake_db.py OUT.sqlite
Prints a JSON line with the counts the extractor is expected to produce.
"""
import datetime as dt
import json
import random
import sqlite3
import sys

COCOA_EPOCH = 978307200

SCHEMA = """
CREATE TABLE ZWACHATSESSION (Z_PK INTEGER PRIMARY KEY, Z_ENT INTEGER, ZCONTACTJID VARCHAR,
  ZPARTNERNAME VARCHAR, ZSESSIONTYPE INTEGER, ZLASTMESSAGEDATE TIMESTAMP);
CREATE TABLE ZWAGROUPMEMBER (Z_PK INTEGER PRIMARY KEY, Z_ENT INTEGER, ZCHATSESSION INTEGER,
  ZMEMBERJID VARCHAR, ZCONTACTNAME VARCHAR, ZFIRSTNAME VARCHAR);
CREATE TABLE ZWAPROFILEPUSHNAME (Z_PK INTEGER PRIMARY KEY, ZJID VARCHAR, ZPUSHNAME VARCHAR);
CREATE TABLE ZWAMESSAGE (Z_PK INTEGER PRIMARY KEY, Z_ENT INTEGER, ZCHATSESSION INTEGER,
  ZGROUPMEMBER INTEGER, ZISFROMME INTEGER, ZMESSAGETYPE INTEGER, ZMESSAGEDATE TIMESTAMP,
  ZTEXT VARCHAR, ZFROMJID VARCHAR, ZTOJID VARCHAR);
"""

MINE = [
    "אין לי זמן השבוע, בוא נדבר ביום ראשון",
    "אני לא יכול היום, אין לי כוח",
    "תמיד אותו סיפור עם הפרויקט הזה",
    "טבלתי בים הבוקר, מטורף איך זה מעיר",
    "קראתי ספר מעולה על הרגלים, שולח לך",
    "צריך לאסוף את הילדים מהגן ב-4",
    "יש לי רעיון לפרויקט חדש, מה אם נבנה את זה ביחד?",
    "סגרתי, אני על זה",
    "אחי אני גמור, אין לי ראש לכלום",
    "תודה, באמת מעריך את זה",
    "אני חייב לישון יותר",
    "מחר בבוקר נשימות וקרח, מי איתי?",
    "אף פעם אין לי רגע לעצמי",
    "גאה בך!",
    "מתי נפגשים?",
]
THEIRS = [
    "מה קורה?",
    "אתה זמין לשיחה?",
    "ראית את ההודעה ששלחתי?",
    "מתי אתה מגיע?",
    "תודה רבה!",
    "חחח מעולה",
    "יש עדכון לגבי הפגישה?",
    "בוקר טוב!",
    "מי בא בשבת?",
    "אני בדרך",
]

CHATS = [
    # pk, jid, partner name, session type, members [(pk, jid, contact, first, push)]
    (1, "972501111111@s.whatsapp.net", "דני כהן", 0, []),
    (2, "972502222222@s.whatsapp.net", "אמא", 0, []),
    (3, "972503333333@s.whatsapp.net", "מיכל עבודה", 0, []),
    (4, "972504444444@s.whatsapp.net", "רועי", 0, []),
    (5, "120363000000001@g.us", "משפחה", 1, [
        (11, "972502222222@s.whatsapp.net", "אמא", None, None),
        (12, "972505555555@s.whatsapp.net", None, "אבא", None),
        (13, "972506666666@s.whatsapp.net", None, None, "נועה"),
        (14, "972507777777@s.whatsapp.net", None, None, None),
    ]),
    (6, "120363000000002@g.us", "חבר'ה מהמילואים", 1, [
        (21, "972501111111@s.whatsapp.net", "דני כהן", None, None),
        (22, "972508888888@s.whatsapp.net", "אורי", None, None),
    ]),
    (7, "status@broadcast", None, 3, []),
    (8, "1600000000@broadcast", "רשימת תפוצה", 2, []),
]


def cocoa(t):
    return t.timestamp() - COCOA_EPOCH


def build(path, seed=7):
    rnd = random.Random(seed)
    conn = sqlite3.connect(path)
    conn.executescript(SCHEMA)
    for pk, jid, name, stype, members in CHATS:
        conn.execute("INSERT INTO ZWACHATSESSION VALUES (?,?,?,?,?,?)", (pk, 1, jid, name, stype, None))
        for mpk, mjid, contact, first, push in members:
            conn.execute("INSERT INTO ZWAGROUPMEMBER VALUES (?,?,?,?,?,?)", (mpk, 2, pk, mjid, contact, first))
            if push:
                conn.execute("INSERT INTO ZWAPROFILEPUSHNAME (ZJID, ZPUSHNAME) VALUES (?,?)", (mjid, push))

    now = dt.datetime.now().replace(microsecond=0)
    expected = {"chats": 6, "messages": 0, "mine": 0, "media": 0, "skipped": 0}
    rows = []

    def add(chat, member, me, mtype, when, body, from_jid=None):
        rows.append((chat, member, 1 if me else 0, mtype, cocoa(when), body, from_jid))

    for pk, jid, name, stype, members in CHATS[:6]:
        for _ in range(rnd.randint(25, 45)):
            day = now - dt.timedelta(days=rnd.randint(1, 180))
            hour = rnd.choice([8, 9, 12, 13, 17, 19, 20, 21, 22, 23, 23, 0, 1])
            t = day.replace(hour=hour, minute=rnd.randint(0, 59), second=rnd.randint(0, 59))
            me_turn = rnd.random() < 0.5
            for _ in range(rnd.randint(2, 7)):
                t += dt.timedelta(seconds=rnd.choice([20, 45, 70, 100, 300, 900, 2400]))
                member = None
                if not me_turn and members:
                    member = rnd.choice(members)[0]
                if rnd.random() < 0.06:
                    add(pk, member, me_turn, 1, t, None)  # photo, no caption
                    expected["media"] += 1
                else:
                    add(pk, member, me_turn, 0, t, rnd.choice(MINE if me_turn else THEIRS))
                expected["messages"] += 1
                expected["mine"] += 1 if me_turn else 0
                me_turn = not me_turn if rnd.random() < 0.8 else me_turn

    old = now - dt.timedelta(days=500)
    add(1, None, True, 0, old, "הודעה ישנה מלפני יותר משנה")
    expected["old"] = 1
    t = now - dt.timedelta(days=3)
    add(5, None, False, 6, t, None)  # group event
    add(1, None, False, 10, t, None)  # call
    add(2, None, False, 14, t, None)  # deleted
    add(3, None, False, 99, t, None)  # unknown, no text
    add(7, None, False, 0, t, "סטטוס")  # status broadcast
    add(8, None, True, 0, t, "רשימת תפוצה")  # broadcast list
    expected["skipped"] = 6
    add(3, None, True, 1, t + dt.timedelta(minutes=1), "צילום של הלוח מהפגישה")  # captioned photo -> text
    expected["messages"] += 1
    expected["mine"] += 1
    add(5, 14, False, 0, t + dt.timedelta(minutes=2), "מי זה המספר הזה?", None)
    expected["messages"] += 1

    rows.sort(key=lambda r: r[4])
    conn.executemany(
        "INSERT INTO ZWAMESSAGE (Z_ENT, ZCHATSESSION, ZGROUPMEMBER, ZISFROMME, ZMESSAGETYPE, ZMESSAGEDATE, ZTEXT, ZFROMJID)"
        " VALUES (9,?,?,?,?,?,?,?)",
        rows,
    )
    conn.commit()
    conn.close()
    return expected


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: make_fake_db.py OUT.sqlite")
    print(json.dumps(build(sys.argv[1]), ensure_ascii=False))
