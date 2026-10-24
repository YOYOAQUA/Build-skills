#!/usr/bin/env python3
"""Build a single self-contained report.html from data.json (+ optional insights.json and summary.json).

Inlines the dashboard assets into assets/report-template.html, so the report opens
offline from disk and nothing is fetched. Python 3.8+ standard library only.

Exit codes: 0 ok, 1 bad input, 2 template/asset problem.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, "..", "assets"))
DATA_MARK = "/*__REPORT_DATA__*/null"
INSIGHTS_MARK = "/*__AI_INSIGHTS__*/null"
SUMMARY_MARK = "/*__SUMMARY__*/null"
INSIGHT_KEYS = ["archetype", "bigFive", "faces", "relationship", "love", "values", "innerVoice", "groups",
                "yearWave", "circle", "pattern", "lens", "nextStep", "distress"]
OCCUPATIONS = ["employee", "freelancer", "founder", "other"]


def fail(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def js_json(obj):
    """JSON safe to drop inside a <script> block."""
    s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return s.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def render(template, assets_dir, data_js, insights_js, summary_js="null"):
    """Single pass over the template: inline assets and fill data placeholders.

    Inserted content is never rescanned, so message text or asset code that happens to
    contain a marker cannot break the report.
    """
    out, pos, filled = [], 0, set()
    fills = {DATA_MARK: data_js, INSIGHTS_MARK: insights_js, SUMMARY_MARK: summary_js}
    markers = ("<!--INLINE_CSS:", "<!--INLINE_JS:") + tuple(fills)
    while True:
        hits = [(template.find(m, pos), m) for m in markers]
        hits = [(i, m) for i, m in hits if i >= 0]
        if not hits:
            out.append(template[pos:])
            break
        start, mark = min(hits)
        out.append(template[pos:start])
        if mark in fills:
            out.append(fills[mark])
            filled.add(mark)
            pos = start + len(mark)
            continue
        end = template.find("-->", start)
        if end < 0:
            fail("Broken marker in template near: " + template[start:start + 60], 2)
        name = template[start + len(mark):end].strip()
        path = os.path.join(assets_dir, name)
        if not os.path.isfile(path):
            fail("Missing asset: " + path, 2)
        with open(path, encoding="utf-8") as fh:
            body = fh.read()
        if mark == "<!--INLINE_CSS:":
            out.append("<style>" + body.replace("</style", "<\\/style") + "</style>")
        else:
            out.append("<script>" + body.replace("</script", "<\\/script") + "</script>")
        pos = end + 3
    missing = {DATA_MARK, INSIGHTS_MARK} - filled
    if missing:
        fail("Template is missing the placeholder " + ", ".join(sorted(missing)), 2)
    return "".join(out)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("data")
    parser.add_argument("--insights", help="insights.json written by Claude")
    parser.add_argument("--summary", help="summary.json from analyze.py (default: next to data.json, if there)")
    parser.add_argument("--out", default="report.html")
    parser.add_argument("--gender", choices=["m", "f", "x"])
    parser.add_argument("--kids", choices=["yes", "no"])
    parser.add_argument("--occupation", choices=OCCUPATIONS)
    parser.add_argument("--template", default=os.path.join(ASSETS, "report-template.html"))
    parser.add_argument("--assets-dir", help="defaults to the template's folder")
    args = parser.parse_args()

    try:
        with open(args.data, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError) as exc:
        fail("Cannot read data.json: {}".format(exc))

    profile = {}
    if args.gender:
        profile["gender"] = args.gender
    if args.kids:
        profile["kids"] = args.kids == "yes"
    if args.occupation:
        profile["occupation"] = args.occupation
    if profile:
        data["profile"] = profile

    insights = None
    if args.insights:
        try:
            with open(args.insights, encoding="utf-8") as fh:
                insights = json.load(fh)
        except (OSError, ValueError) as exc:
            fail("insights.json is not valid JSON - fix it and rerun: {}".format(exc))
        missing = [k for k in INSIGHT_KEYS if k not in insights]
        if missing:
            print("Warning: insights.json is missing keys: " + ", ".join(missing), file=sys.stderr)

    summary = None
    summary_path = args.summary or os.path.join(os.path.dirname(os.path.abspath(args.data)), "summary.json")
    if os.path.isfile(summary_path):
        try:
            with open(summary_path, encoding="utf-8") as fh:
                summary = json.load(fh)
        except (OSError, ValueError) as exc:
            fail("Cannot read summary.json: {}".format(exc))

    if not os.path.isfile(args.template):
        fail("Template not found: " + args.template, 2)
    with open(args.template, encoding="utf-8") as fh:
        template = fh.read()
    assets_dir = args.assets_dir or os.path.dirname(os.path.abspath(args.template))
    html = render(template, assets_dir, js_json(data), js_json(insights), js_json(summary))

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(html)
    print("OK: report written to {} ({} KB)".format(args.out, round(len(html.encode("utf-8")) / 1024)))


if __name__ == "__main__":
    main()
