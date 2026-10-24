#!/usr/bin/env python3
"""Packs the skill (.claude/skills/whatsapp-insights) as the public repo github.com/YOYOAQUA/wa-mirror into
release/wa-mirror/, the folder that gets uploaded through the GitHub web page (no git credentials on this Mac).
Run whatsapp-insights/scripts/build.sh first, so the skill has the latest dashboard and config."""
import re, shutil
from pathlib import Path

ROOT = Path(__file__).parent
SKILL = ROOT.parent.parent / ".claude" / "skills" / "whatsapp-insights"
OUT = ROOT / "release" / "wa-mirror"

README = """# wa-mirror · מה הוואטסאפ שלך יודע עליך

סקיל חינמי ל-Claude Code. עובר על השנה האחרונה בוואטסאפ שלך, על המחשב שלך, ובונה ניתוח אישיות בעברית, עם הוכחה לכל טענה:
הארכיטיפ שלך (אחד מ-12), 5 ממדי אישיות, הפרצופים שלך בעולמות שונים, סגנון קשר, איך אתה נותן אהבה,
ערכים מול מציאות, הקול הפנימי, התפקיד שלך בקבוצות, השנה שלך כגל, ציון התאוששות דיגיטלית, וצעד אחד לשבוע הקרוב.

**המדריך המלא, צעד אחרי צעד:** https://yoavyosha.ravpage.co.il/mirror

## התקנה
ב-Claude ← לשונית Code ← סשן חדש:
```
תתקין לי את הסקיל wa-mirror מהקישור הזה:
https://github.com/YOYOAQUA/wa-mirror
תוריד את הקבצים, ותשים אותם בתיקייה בשם wa-mirror בתוך תיקיית הסקילים של Claude.
תבדוק שיש בה קובץ SKILL.md.
בסוף תגיד לי לפתוח סשן חדש.
```

## שימוש
בסשן חדש: **תנתח את הוואטסאפ שלי**

- **מק עם וואטסאפ למחשב:** קורא את כל השיחות בבת אחת, מעותק, במצב קריאה בלבד.
- **כל מחשב:** שיחות שמייצאים מהטלפון (ייצוא צ'אט ← ללא מדיה).

## פרטיות
- הסקריפטים רצים על המחשב שלך, בלי חיבור לחשבון, ולא שולחים שום הודעה.
- כדי לכתוב את הניתוח, Claude קורא את המספרים ודגימה של כאלף הודעות שלך, עם הודעה או שתיים שקדמו לכל אחת, להקשר. כמו בכל שיחה איתו.
- הכל נשמר בתיקייה `~/WhatsApp-Insights`, כולל הדוח (שמכיל את ההודעות: משתפים רק את הכרטיס). מוחקים אותה, והכל נעלם.

זו מראה, לא אבחון. אם קשה לך, ער״ן זמינים 24/7 בטלפון 1201.

נבנה על ידי [יואב יושע](https://www.instagram.com/yoav_yosha/). רישיון MIT.
"""

LICENSE = """MIT License

Copyright (c) 2026 Yoav Yosha

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

if OUT.exists():
    shutil.rmtree(OUT)
shutil.copytree(SKILL, OUT, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store"))
skill_md = OUT / "SKILL.md"
# The folder is named wa-mirror once installed, and a skill's name must match its folder.
skill_md.write_text(re.sub(r"^name: .*$", "name: wa-mirror", skill_md.read_text(encoding="utf-8"), count=1, flags=re.M), encoding="utf-8")
(OUT / "README.md").write_text(README, encoding="utf-8")
(OUT / "LICENSE").write_text(LICENSE, encoding="utf-8")
for p in sorted(OUT.rglob("*")):
    if p.is_file():
        print(p.relative_to(OUT))
