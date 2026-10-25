#!/usr/bin/env python3
"""Builds the paste-ready Rav Messer pages into dist/ (same recipe as the zahav, radar and ezra funnels):
- embeds images as base64 (PNG screenshots become WebP)
- fills the Rav Messer form id once the form exists
- checks the %XX trap, attributes built by concatenation inside scripts, and lists what is still to fill
Copy a page to the clipboard (Mac): LANG=en_US.UTF-8 pbcopy < dist/mirror.html"""
import base64, re, sys
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).parent
IMG = Path.home() / "מאסטרקלאס" / "img"
IMAGES = {"IMG_PORTRAIT": IMG / "portrait_square.webp", "IMG_TALK": IMG / "s_talk.webp"}
IMG_DIR = ROOT / "pages" / "img"

# The embed id of the Rav Messer form "נרשמים מראה" (list "מראה", tag "מראה", redirects to /mirror-go).
# Its own list, not "קלוד": joining "קלוד" fires the zahav welcome automation.
RAVMESSER_FORM = "ed82c9bbb95abca1a7ff0fc70a0def7e6ADD0607"


def data_uri(p):
    """PNG screenshots go in as WebP, like the radar's images: about a quarter of the size."""
    if p.suffix != ".png":
        return "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()
    from PIL import Image
    im = Image.open(p).convert("RGB")
    if im.width > 900:  # nobody sees more than this on a page; it keeps the paste small
        im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
    buf = BytesIO()
    im.save(buf, "WEBP", quality=80, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


(ROOT / "dist").mkdir(exist_ok=True)
ok = True
for page in sorted((ROOT / "pages").glob("*.html")):
    html = page.read_text(encoding="utf-8")
    if RAVMESSER_FORM:
        html = html.replace("RAVMESSER_FORM_ID", RAVMESSER_FORM)
    for key, path in IMAGES.items():
        html = html.replace(key, data_uri(path))
    html = re.sub(r'src="img/([^"]+)"', lambda m: 'src="' + data_uri(IMG_DIR / m.group(1)) + '"', html)
    # The bytes are already in the page, so lazy loading only adds a way to fail
    # (on iPhone it showed a "?" instead of the image inside Rav Messer).
    html = re.sub(r'(<img\b[^>]*?)\s+loading="lazy"', r"\1", html)
    out = ROOT / "dist" / page.name
    out.write_text(html, encoding="utf-8")
    bad = re.findall(r"%[0-9A-Fa-f]{2}", html)
    # Rav Messer strips an HTML attribute whose value is glued together in JS:
    # '<li class="'+x+'">' became '<li +x+'">' and broke the whole script.
    for js in re.findall(r"<script(?![^>]*src)[^>]*>(.*?)</script>", html, re.S):
        bad += ["attribute built by concatenation: " + t for t in re.findall(r"=[\"']'\s*\+|=['\"]\"\s*\+", js)]
    todo = sorted(set(re.findall(r"\bRAVMESSER_[A-Z_]+\b", html)))
    print(f"{out.name}: {len(html) // 1024}KB" + (f"  !! {bad[:5]}" if bad else "  checks ok")
          + (f"  | still to fill: {', '.join(todo)}" if todo else ""))
    ok &= not bad
sys.exit(0 if ok else 1)
