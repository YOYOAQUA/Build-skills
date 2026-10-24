#!/usr/bin/env bash
# Copies the shared dashboard assets into the Claude Code skill and builds the
# downloadable skill ZIP that the web tool links to. Run from anywhere.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB="$ROOT/whatsapp-insights/web"
SKILL="$ROOT/.claude/skills/whatsapp-insights"

mkdir -p "$SKILL/assets" "$WEB/downloads"
cp "$WEB/assets/lexicon.js" "$WEB/assets/engine.js" "$WEB/assets/dashboard.js" "$WEB/assets/styles.css" "$SKILL/assets/"
cp "$WEB/config.js" "$SKILL/assets/config.js"
cp "$WEB/report-template.html" "$SKILL/assets/report-template.html"

rm -f "$WEB/downloads/whatsapp-insights-skill.zip"
(cd "$ROOT/.claude/skills" && zip -qr "$WEB/downloads/whatsapp-insights-skill.zip" whatsapp-insights -x '*/__pycache__/*' '*.pyc' '*/.DS_Store')

echo "skill assets synced, zip: $WEB/downloads/whatsapp-insights-skill.zip ($(du -h "$WEB/downloads/whatsapp-insights-skill.zip" | cut -f1))"
