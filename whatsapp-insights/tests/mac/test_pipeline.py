#!/usr/bin/env python3
"""End-to-end tests for the whatsapp-insights skill scripts.

Run: python3 -I whatsapp-insights/tests/mac/test_pipeline.py
"""
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
SCRIPTS = os.path.join(ROOT, ".claude", "skills", "whatsapp-insights", "scripts")
FIXTURES = os.path.normpath(os.path.join(HERE, "..", "fixtures"))
sys.path.insert(0, HERE)

import make_fake_db  # noqa: E402
import make_fixtures  # noqa: E402


def run(script, *args):
    return subprocess.run(
        [sys.executable, "-I", os.path.join(SCRIPTS, script)] + list(args),
        capture_output=True,
        text=True,
    )


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


class MacExtract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.db = os.path.join(cls.tmp.name, "ChatStorage.sqlite")
        cls.expected = make_fake_db.build(cls.db)
        cls.out = os.path.join(cls.tmp.name, "data.json")
        cls.res = run("extract_mac.py", "--db", cls.db, "--out", cls.out)
        cls.data = load(cls.out) if cls.res.returncode == 0 else None

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_runs(self):
        self.assertEqual(self.res.returncode, 0, self.res.stderr)
        self.assertIn("OK:", self.res.stdout)

    def test_contract(self):
        d = self.data
        self.assertEqual(d["version"], 1)
        self.assertEqual(d["source"], "mac-db")
        self.assertEqual(d["me"], "אני")
        self.assertEqual(len(d["chats"]), self.expected["chats"])
        for c in d["chats"]:
            self.assertIn(c["type"], ("private", "group"))
            times = [m["t"] for m in c["messages"]]
            self.assertEqual(times, sorted(times))
            for m in c["messages"]:
                self.assertEqual(set(m), {"t", "s", "me", "x", "media"})
                self.assertEqual(len(m["t"]), 19)
                if m["me"]:
                    self.assertEqual(m["s"], "אני")

    def test_counts_and_skips(self):
        msgs = [m for c in self.data["chats"] for m in c["messages"]]
        self.assertEqual(len(msgs), self.expected["messages"])
        self.assertEqual(sum(m["me"] for m in msgs), self.expected["mine"])
        self.assertEqual(sum(m["media"] for m in msgs), self.expected["media"])
        names = {c["name"] for c in self.data["chats"]}
        self.assertNotIn("רשימת תפוצה", names)
        texts = {m["x"] for m in msgs}
        self.assertIn("צילום של הלוח מהפגישה", texts)
        self.assertNotIn("הודעה ישנה מלפני יותר משנה", texts)

    def test_group_sender_names(self):
        family = next(c for c in self.data["chats"] if c["name"] == "משפחה")
        self.assertEqual(family["type"], "group")
        senders = {m["s"] for m in family["messages"] if not m["me"]}
        self.assertTrue(senders <= {"אמא", "אבא", "נועה", "+972507777777"}, senders)
        self.assertIn("+972507777777", senders)

    def test_months_zero_includes_old(self):
        out = os.path.join(self.tmp.name, "all.json")
        res = run("extract_mac.py", "--db", self.db, "--out", out, "--months", "0")
        self.assertEqual(res.returncode, 0, res.stderr)
        texts = {m["x"] for c in load(out)["chats"] for m in c["messages"]}
        self.assertIn("הודעה ישנה מלפני יותר משנה", texts)

    def test_missing_db(self):
        res = run("extract_mac.py", "--db", "/nonexistent/ChatStorage.sqlite", "--out", "/tmp/x.json")
        self.assertEqual(res.returncode, 1)

    def test_bad_schema(self):
        bad = os.path.join(self.tmp.name, "bad.sqlite")
        conn = sqlite3.connect(bad)
        conn.execute("CREATE TABLE ZWAMESSAGE (Z_PK INTEGER, ZTEXT VARCHAR)")
        conn.commit()
        conn.close()
        res = run("extract_mac.py", "--db", bad, "--out", os.path.join(self.tmp.name, "b.json"))
        self.assertEqual(res.returncode, 2)
        self.assertIn("ZWAMESSAGE", res.stderr)

    def test_analyze_and_sample(self):
        out_dir = os.path.join(self.tmp.name, "analysis")
        res = run("analyze.py", self.out, "--out-dir", out_dir)
        self.assertEqual(res.returncode, 0, res.stderr)
        s = load(os.path.join(out_dir, "summary.json"))
        self.assertEqual(s["totals"]["mine"], self.expected["mine"])
        self.assertEqual(sum(s["hourHistogram"]), self.expected["mine"])
        self.assertEqual(sum(s["weekdayHistogram"]), self.expected["mine"])
        self.assertTrue(0 <= s["recoveryScore"] <= 100)
        self.assertIn(s["recoveryBand"], ("נמוך", "בינוני", "גבוה"))
        self.assertGreater(s["nightShare"], 0)
        self.assertGreater(s["fastShare"], 0)
        self.assertLessEqual(len(s["topChats"]), 15)
        phrases = {p["phrase"]: p for p in s["limitingPhrases"]}
        self.assertGreater(phrases["אין לי זמן"]["count"], 0)
        self.assertLessEqual(len(phrases["אין לי זמן"]["examples"]), 3)
        self.assertFalse(s["distressFlag"])
        with open(os.path.join(out_dir, "sample.md"), encoding="utf-8") as fh:
            sample = fh.read()
        self.assertIn("] אני: ", sample)
        self.assertIn("\n> ", sample)
        self.assertGreater(s["sampleMessages"], 50)


class Exports(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        make_fixtures.write()
        cls.tmp = tempfile.TemporaryDirectory()

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def parse(self, *files, me="רון"):
        out = os.path.join(self.tmp.name, "data.json")
        args = list(files) + ["--out", out]
        if me:
            args += ["--me", me]
        res = run("parse_export.py", *args)
        return res, (load(out) if res.returncode == 0 else None)

    def test_ios(self):
        res, d = self.parse(os.path.join(FIXTURES, "ios_export.txt"))
        self.assertEqual(res.returncode, 0, res.stderr)
        chat = d["chats"][0]
        self.assertEqual(chat["type"], "group")
        msgs = chat["messages"]
        self.assertEqual(len(msgs), 14)
        self.assertEqual(sum(m["me"] for m in msgs), 7)
        self.assertEqual(sum(m["media"] for m in msgs), 3)
        multi = next(m for m in msgs if m["x"].startswith("תמיד אותו סיפור"))
        self.assertEqual(multi["x"].count("\n"), 2)
        self.assertEqual(msgs[0]["t"], "2026-09-12T21:05:40")
        self.assertFalse(any("encrypted" in m["x"] or "created group" in m["x"] for m in msgs))

    def test_ios_zip_matches_txt(self):
        _, a = self.parse(os.path.join(FIXTURES, "ios_export.txt"))
        _, b = self.parse(os.path.join(FIXTURES, "ios_export.zip"))
        self.assertEqual(a["chats"][0]["messages"], b["chats"][0]["messages"])
        self.assertEqual(b["chats"][0]["name"], "ios_export")

    def test_android(self):
        res, d = self.parse(os.path.join(FIXTURES, "android_export.txt"))
        self.assertEqual(res.returncode, 0, res.stderr)
        chat = d["chats"][0]
        self.assertEqual(chat["type"], "private")
        msgs = chat["messages"]
        self.assertEqual(len(msgs), 8)
        self.assertEqual(sum(m["me"] for m in msgs), 4)
        self.assertEqual(sum(m["media"] for m in msgs), 1)
        multi = next(m for m in msgs if m["x"].startswith("קיבלתי"))
        self.assertIn("- נקודה שנייה", multi["x"])
        self.assertEqual(msgs[0]["t"], "2026-10-20T08:02:00")

    def test_multiple_files(self):
        res, d = self.parse(os.path.join(FIXTURES, "ios_export.txt"), os.path.join(FIXTURES, "android_export.txt"))
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertEqual(len(d["chats"]), 2)
        self.assertEqual(d["range"], {"from": "2026-09-12", "to": "2026-10-22"})

    def test_missing_me_lists_participants(self):
        res, _ = self.parse(os.path.join(FIXTURES, "ios_export.txt"), me=None)
        self.assertEqual(res.returncode, 4)
        self.assertIn("רון", res.stdout)
        self.assertIn("דני כהן", res.stdout)

    def test_us_ampm_and_names(self):
        path = os.path.join(self.tmp.name, "WhatsApp Chat with Dana.txt")
        lines = [
            "[1/5/26, 9:14:03 PM] Dana: hi there",
            "[1/5/26, 9:15:10 PM] Ron: I can't tonight, no time",
            "[1/13/26, 12:01:00 AM] Ron: still up",
        ]
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("\n".join(lines))
        res, d = self.parse(path, me="ron")
        self.assertEqual(res.returncode, 0, res.stderr)
        chat = d["chats"][0]
        self.assertEqual(chat["name"], "Dana")
        self.assertEqual([m["t"] for m in chat["messages"]], ["2026-01-05T21:14:03", "2026-01-05T21:15:10", "2026-01-13T00:01:00"])
        self.assertEqual(d["me"], "ron")

    def test_hebrew_ampm(self):
        path = os.path.join(self.tmp.name, "heb.txt")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("25.12.2025, 9:05 אחה\"צ - יעל: היי\n25.12.2025, 9:06 לפנה״צ - רון: בוקר\n")
        res, d = self.parse(path)
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertEqual([m["t"][11:16] for m in d["chats"][0]["messages"]], ["09:06", "21:05"])


class AnalyzeRules(unittest.TestCase):
    def test_metrics_and_distress(self):
        data = {
            "version": 1, "source": "export", "generatedAt": "2026-10-24T22:00:00", "me": "אני",
            "range": {"from": "2026-10-03", "to": "2026-10-10"},
            "chats": [{"name": "דני", "type": "private", "messages": [
                {"t": "2026-10-03T23:30:00", "s": "דני", "me": False, "x": "ער?", "media": False},
                {"t": "2026-10-03T23:31:00", "s": "אני", "me": True, "x": "כן, אין לי זמן לישון", "media": False},
                {"t": "2026-10-04T01:00:00", "s": "אני", "me": True, "x": "רוצה למות מצחוק חחח", "media": False},
                {"t": "2026-10-10T12:00:00", "s": "דני", "me": False, "x": "מה נשמע", "media": False},
                {"t": "2026-10-10T12:30:00", "s": "אני", "me": True, "x": "ואין לי זמן בכלל", "media": False},
            ]}],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "data.json")
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False)
            res = run("analyze.py", path, "--out-dir", tmp)
            self.assertEqual(res.returncode, 0, res.stderr)
            s = load(os.path.join(tmp, "summary.json"))
            self.assertFalse(s["distressFlag"])  # slang "רוצה למות מצחוק" is not distress
            self.assertEqual(s["nightShare"], round(2 / 3, 4))
            self.assertEqual(s["myReplies"], 2)
            self.assertEqual(s["fastShare"], 0.5)
            self.assertEqual(s["satShare"], round(2 / 3, 4))  # Oct 3 and Oct 10 2026 are Saturdays
            self.assertEqual(s["lateDays"], 1)
            phrases = {p["phrase"]: p["count"] for p in s["limitingPhrases"]}
            self.assertEqual(phrases["אין לי זמן"], 2)
            # 100 - min(35, .6667*140) - min(25, .5*50) - min(15, (.6667-1/7)*150) - min(25, 1/max(1,7/7)*6)
            self.assertEqual(s["recoveryScore"], 100 - 35 - 25 - 15 - 6)

            data["chats"][0]["messages"][2]["x"] = "אני לא רוצה לחיות ככה יותר"
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False)
            run("analyze.py", path, "--out-dir", tmp)
            self.assertTrue(load(os.path.join(tmp, "summary.json"))["distressFlag"])
            with open(os.path.join(tmp, "sample.md"), encoding="utf-8") as fh:
                self.assertNotIn("לא רוצה לחיות", fh.read())


class Report(unittest.TestCase):
    def test_build_with_stand_in_template(self):
        with tempfile.TemporaryDirectory() as tmp:
            assets = os.path.join(tmp, "assets")
            os.makedirs(assets)
            for name, body in (("styles.css", "body{color:red}"), ("engine.js", "var E='</script>'; /*__REPORT_DATA__*/null;")):
                with open(os.path.join(assets, name), "w", encoding="utf-8") as fh:
                    fh.write(body)
            template = os.path.join(assets, "report-template.html")
            with open(template, "w", encoding="utf-8") as fh:
                fh.write("<html><!--INLINE_CSS:styles.css--><!--INLINE_JS:engine.js-->"
                         "<script>window.D=/*__REPORT_DATA__*/null;window.I=/*__AI_INSIGHTS__*/null;</script></html>")
            data = os.path.join(tmp, "data.json")
            with open(data, "w", encoding="utf-8") as fh:
                json.dump({"version": 1, "me": "אני", "chats": [{"name": "x", "type": "private", "messages": [
                    {"t": "2026-10-01T10:00:00", "s": "אני", "me": True, "x": "</script><!--INLINE_JS:engine.js-->", "media": False}]}]},
                    fh, ensure_ascii=False)
            ins = os.path.join(tmp, "insights.json")
            with open(ins, "w", encoding="utf-8") as fh:
                json.dump({"pattern": {"title": "ט", "body": "ב"}, "insights": [], "limitingBeliefs": [], "circle": [],
                           "lens": {"title": "", "body": ""}, "nextStep": "צעד", "distress": False}, fh, ensure_ascii=False)
            out = os.path.join(tmp, "report.html")
            res = run("build_report.py", data, "--insights", ins, "--out", out, "--template", template,
                      "--gender", "m", "--kids", "yes", "--occupation", "founder")
            self.assertEqual(res.returncode, 0, res.stderr)
            with open(out, encoding="utf-8") as fh:
                html = fh.read()
            self.assertEqual(html.count("<script>"), 2)
            self.assertEqual(html.count("</script>"), 2)
            self.assertIn("<style>body{color:red}</style>", html)
            self.assertIn('"profile":{"gender":"m","kids":true,"occupation":"founder"}', html)
            self.assertIn('window.I={"pattern"', html)
            self.assertIn("/*__REPORT_DATA__*/null;", html)  # marker inside the asset is left alone

            res = run("build_report.py", data, "--out", out, "--template", template)
            self.assertEqual(res.returncode, 0, res.stderr)
            with open(out, encoding="utf-8") as fh:
                html = fh.read()
            self.assertIn("window.I=null;", html)
            self.assertNotIn('"profile"', html)


if __name__ == "__main__":
    unittest.main(verbosity=2)
