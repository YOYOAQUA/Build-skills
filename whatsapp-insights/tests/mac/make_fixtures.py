#!/usr/bin/env python3
"""Write the synthetic WhatsApp export fixtures to whatsapp-insights/tests/fixtures/.

ios_export.txt / ios_export.zip (_chat.txt inside): iPhone group export, me = "רון".
android_export.txt: Android private chat export (Hebrew locale), me = "רון".
"""
import os
import zipfile

LRM = "‎"
HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.normpath(os.path.join(HERE, "..", "fixtures"))

IOS_LINES = [
    "[12/09/2026, 21:02:11] חבר'ה: {L}Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.",
    "[12/09/2026, 21:02:11] חבר'ה: {L}דני כהן created group \"חבר'ה\"",
    "[12/09/2026, 21:03:30] חבר'ה: {L}דני כהן added רון",
    "[12/09/2026, 21:05:40] דני כהן: מי בא מחר לים?",
    "[12/09/2026, 21:06:02] רון: אני בפנים 🙌",
    "[12/09/2026, 21:06:30] אורי לוי: אין לי זמן השבוע, אולי בשבת",
    "{L}[12/09/2026, 21:07:15] דני כהן: {L}image omitted",
    "[12/09/2026, 21:08:01] רון: תמיד אותו סיפור איתך חחח",
    "אבל באמת, תבוא",
    "יהיה כיף",
    "[13/09/2026, 00:41:22] רון: מישהו ער? לא נרדם",
    "[13/09/2026, 00:42:05] אורי לוי: {L}This message was deleted.",
    "[13/09/2026, 07:15:00] דני כהן: בוקר טוב! מי טובל איתי ב-6 מחר?",
    "[13/09/2026, 07:15:50] רון: אני חייב לישון יותר, אבל בא",
    "{L}[14/09/2026, 23:30:12] אורי לוי: {L}sticker omitted",
    "[14/09/2026, 23:31:00] רון: אני לא יכול מחר, יש לי פגישה מוקדמת",
    "{L}[15/09/2026, 13:22:45] דני כהן: {L}<attached: 00000021-PHOTO-2026-09-15-13-22-45.jpg>",
    "[15/09/2026, 13:24:10] רון: מטורף!! איפה זה?",
    "[19/09/2026, 10:02:33] אורי לוי: https://example.com/article קראתם?",
    "[19/09/2026, 10:30:00] רון: קראתי, חזק. מה אם ננסה את זה בעצמנו?",
]

ANDROID_LINES = [
    "20.10.2026, 08:01 - ההודעות והשיחות מוצפנות מקצה לקצה. אף אחד מחוץ לצ'אט הזה, גם לא WhatsApp, לא יכול לקרוא או להאזין להן. יש להקיש כדי לקבל מידע נוסף.",
    "20.10.2026, 08:02 - מיכל: בוקר טוב, אתה זמין לשיחה היום?",
    "20.10.2026, 08:03 - רון: אין לי ראש היום, אבל ננסה ב-4",
    "20.10.2026, 08:03 - מיכל: <המדיה הושמטה>",
    "20.10.2026, 08:10 - רון: קיבלתי. אני על זה",
    "שולח לך סיכום עד הערב",
    "- נקודה ראשונה",
    "- נקודה שנייה",
    "21.10.2026, 23:47 - רון: עוד ער, עובד על המצגת",
    "22.10.2026, 07:30 - מיכל: הודעה זו נמחקה",
    "22.10.2026, 07:31 - מיכל: ראית את המייל?",
    "22.10.2026, 07:32 - רון: כן, אני חייב לסגור את זה עד הצהריים",
    "22.10.2026, 12:15 - מיכל: מעולה, תודה!",
]


def write():
    os.makedirs(FIXTURES, exist_ok=True)
    ios = "\n".join(line.format(L=LRM) for line in IOS_LINES) + "\n"
    android = "\n".join(ANDROID_LINES) + "\n"
    with open(os.path.join(FIXTURES, "ios_export.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(ios)
    with open(os.path.join(FIXTURES, "android_export.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(android)
    zpath = os.path.join(FIXTURES, "ios_export.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as zf:
        info = zipfile.ZipInfo("_chat.txt", date_time=(2026, 9, 19, 10, 30, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        zf.writestr(info, ios.encode("utf-8"))
    return FIXTURES


if __name__ == "__main__":
    print("fixtures written to " + write())
