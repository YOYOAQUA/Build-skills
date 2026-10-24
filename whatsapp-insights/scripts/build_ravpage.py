#!/usr/bin/env python3
"""Builds the two paste-ready pages for Rav Messer into dist/:
- mirror-tool.html: the tool (web/app.html) as one page. Rav Messer takes a page as one block of HTML, so the
  stylesheet goes in inline and the privacy page becomes a section that opens at the bottom. All the scripts go
  in as one base64 string: Rav Messer rewrites HTML attributes it finds inside a script ('<li class="'+x+'">'
  became '<li +x+'">' and killed the whole script) and decodes %XX, and base64 has neither.
- mirror-landing.html: the block above the signup form (rav-messer/landing-block.html), its image embedded.

Copy to the clipboard (Mac): LANG=en_US.UTF-8 pbcopy < whatsapp-insights/dist/mirror-tool.html"""
import base64, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
DIST = ROOT / "dist"

# Both pages live on Rav Messer's own address: the landing page (with the form) is /mirror, the tool is /mirror-tool.
LANDING_URL = "https://yoavyosha.ravpage.co.il/mirror"
CONFIG = {
    "siteUrl": "yoavyosha.ravpage.co.il/mirror",  # printed on the story card
    "skillZip": "https://raw.githubusercontent.com/YOYOAQUA/Build-skills/whatsapp-insights/whatsapp-insights/web/downloads/whatsapp-insights-skill.zip",
}
SCRIPTS = ["config.js", "assets/lexicon.js", "assets/engine.js", "assets/dashboard.js", "assets/demo.js", "assets/app.js"]
FONTS = "https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&display=swap"
JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"

# Heebo everywhere (Yoav's pages are all Heebo). It is wider than Karantina, so the big numbers get smaller.
# Rav Messer wraps the code in a centered box with its own margins: the page paints its own background
# and sets its own alignment.
RAV_CSS = """
:root { --font-display: "Heebo", Arial, sans-serif; --font-body: "Heebo", Arial, sans-serif; }
html, body { margin: 0 !important; padding: 0 !important; background: var(--bg) !important; }
.wai-page { direction: rtl; text-align: right; background: var(--bg); color: var(--ink); font-family: var(--font-body); font-size: 16px; line-height: 1.6; min-height: 100vh; }
.wai-page .drop { text-align: center; }
.wai-arch { font-weight: 900; font-size: clamp(44px, 9vw, 72px); line-height: 1; letter-spacing: -.02em; }
.wai-score__num { font-size: 76px; }
.wai-score__of { font-size: 28px; }
.wai-hl__val { font-size: 34px; }
.wai-stat__val, .wai-card__val { font-size: 30px; }
.wai-cta__title { font-size: 26px; }
.site-mark { font-size: 24px; font-weight: 900; }
.privacy summary { cursor: pointer; font-size: 20px; font-weight: 700; }
.privacy .prose { padding-block: 0; }
@media (max-width: 720px) {
  .wai-hl__val { font-size: 26px; }
  .wai-score__num { font-size: 64px; }
}
"""

# The footer link opens the privacy section instead of going to privacy.html.
PRIVACY_JS = """
document.querySelectorAll('a[href="#privacy"]').forEach(function (a) {
  a.addEventListener('click', function () { document.getElementById('privacy').open = true; });
});
"""


def between(text, start, end):
    i = text.index(start) + len(start)
    return text[i:text.index(end, i)]


def build_tool():
    app = (WEB / "app.html").read_text(encoding="utf-8")
    body = between(app, "<body>", "<script").strip()
    body = body.replace('class="site-mark" href="./"', f'class="site-mark" href="{LANDING_URL}"')
    body = body.replace('href="privacy.html"', 'href="#privacy"')

    privacy = between((WEB / "privacy.html").read_text(encoding="utf-8"), '<main class="wai-wrap prose">', "</main>")
    privacy = re.sub(r"\s*<h1>.*?</h1>", "", privacy, count=1)
    section = f'<details class="step privacy" id="privacy">\n    <summary>פרטיות</summary>\n    <div class="prose">{privacy}</div>\n  </details>\n'
    body = body.replace("</main>", "  " + section + "</main>", 1)

    js = [(WEB / s).read_text(encoding="utf-8") for s in SCRIPTS]
    js.insert(1, "Object.assign(window.WAI_CONFIG, " + json.dumps(CONFIG, ensure_ascii=False) + ");")
    js.append(PRIVACY_JS)
    bundle = base64.b64encode(";\n".join(js).encode("utf-8")).decode("ascii")

    css = (WEB / "assets" / "styles.css").read_text(encoding="utf-8") + RAV_CSS
    return f"""<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>המראה · מה הוואטסאפ שלך יודע עליך</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>
{css}
</style>
</head>
<body>
<div class="wai-page">
{body}
</div>
<script src="{JSZIP}"></script>
<script>
(function () {{
  var b = "{bundle}";
  var bytes = Uint8Array.from(atob(b), function (c) {{ return c.charCodeAt(0); }});
  var s = document.createElement('script');
  s.text = new TextDecoder().decode(bytes);
  document.body.appendChild(s);
}})();
</script>
</body>
</html>
"""


def build_landing():
    """The block's images go in as base64: Rav Messer has nowhere to serve img/ from."""
    block = (ROOT / "rav-messer" / "landing-block.html").read_text(encoding="utf-8")
    embed = lambda m: 'src="data:image/png;base64,' + base64.b64encode((ROOT / "rav-messer" / "img" / m.group(1)).read_bytes()).decode("ascii") + '"'
    return re.sub(r'src="img/([^"]+\.png)"', embed, block)


def problems(html):
    bad = ["%XX: " + m for m in re.findall(r"%[0-9A-Fa-f]{2}", html)]
    for js in re.findall(r"<script(?![^>]*src)[^>]*>(.*?)</script>", html, re.S):
        bad += ["attribute built by concatenation: " + t for t in re.findall(r"=[\"']'\s*\+|=['\"]\"\s*\+", js)]
    bad += ["local file: " + m for m in re.findall(r'(?:src|href)="(?!https://|#|mailto:|data:)([^"]+)"', html)]
    bad += ["lazy image" for _ in re.findall(r'loading="lazy"', html)]
    return bad


DIST.mkdir(exist_ok=True)
ok = True
for name, html in (("mirror-tool.html", build_tool()), ("mirror-landing.html", build_landing())):
    out = DIST / name
    out.write_text(html, encoding="utf-8")
    bad = problems(html)
    print(f"{out.relative_to(ROOT.parent)}: {len(html.encode('utf-8')) // 1024}KB" + (f"  !! {bad[:5]}" if bad else "  checks ok"))
    ok &= not bad
sys.exit(0 if ok else 1)
