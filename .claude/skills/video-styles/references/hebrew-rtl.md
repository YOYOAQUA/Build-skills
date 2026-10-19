# Hebrew + RTL Rules

Read before writing any on-screen Hebrew. Most "broken Hebrew" in rendered video comes from the five mistakes below.

## 1. Direction

- Root: `<html lang="he" dir="rtl">`.
- Every text element that holds Hebrew gets `dir="rtl"` explicitly - blocks copied from the registry are usually `ltr` and will flip punctuation (`!כאן זה העתיד` instead of `העתיד זה כאן!`).
- A beat that is pure English (a brand name, "Claude Code") gets `dir="ltr"` on its own element. Mixed lines stay `rtl` - the browser's bidi algorithm handles English words and numbers inside Hebrew.
- If trailing punctuation still jumps to the wrong side in a mixed line, append `&rlm;` after it.

## 2. Animating letters and words

- NEVER reverse a Hebrew string to "fix" direction. DOM order = reading order; inside an `rtl` container it renders right-to-left on its own.
- Split by grapheme, not by code unit, so niqqud and marks stay on their letter:
  ```js
  const graphemes = [...new Intl.Segmenter("he", { granularity: "grapheme" }).segment(text)].map((s) => s.segment);
  ```
- Wrap each WORD in `<span class="word" style="display:inline-block;white-space:nowrap">`, letters inside it, spaces as plain text between words. Splitting a word across lines mid-animation looks broken.
- A positive `stagger` on DOM order reveals right-to-left - which is correct for Hebrew.
- Hebrew letters don't join, so per-letter spans are safe (unlike Arabic).

## 3. Reveals and entrances

| Move | Hebrew direction |
|---|---|
| Mask / wipe reveal | Opens from the RIGHT: `clip-path: inset(0 0 0 100%)` -> `inset(0 0 0 0)` |
| Slide-in | Enter from the right: `x: 80 -> 0` |
| Typing | Characters append on the left edge of the line - substring reveal does this for free |
| Handwriting draw | Strokes progress right-to-left |
| Two-column layouts | Right column first |

## 4. Fonts (bundled in `assets/fonts/`, all SIL Open Font License)

Link `fonts/fonts.css` and list concrete names in `body { font-family: 'Heebo', 'Rubik', 'Secular One', sans-serif; }` - the HyperFrames linter does not expand CSS variables.

| Font | Weights | Use for |
|---|---|---|
| Heebo | 400, 800, 900 | Default. Labels, coverlines, glass words, numbers |
| Rubik | 500, 800 | Chat bubbles, rounded friendly UI |
| Secular One | 400 | Printed headlines, stop numbers, punchy short words |
| Frank Ruhl Libre | 900 | Magazine masthead, editorial serif |
| Karantina | 700 | Condensed display - mastheads, posters, collage letters |
| Amatic SC | 700 | Handwriting - sticky notes, marker words. Thin: go 90px+ |

Need another font? Download the Hebrew + Latin subsets as local `.woff2`, add an `@font-face` - never load from Google Fonts at render time.

## 5. Copy rules

- Max ~16-18 Hebrew characters per line at 60px on a 1080-wide reel. Break lines by meaning, not by width.
- Numbers as digits on screen even when spoken as words (`שלושה צעדים` -> `3 צעדים`).
- Hebrew punctuation: geresh `׳` for abbreviations and borrowed sounds (`צ׳אט`), gershayim `״` for acronyms (`מנכ״ל`).
- Short hyphens only (-). No em-dashes.

## 6. Transcription fixes to look for

Whisper in Hebrew gets these wrong most often - fix them in `transcript.json` before building:
- English terms said in Hebrew ("קלוד קוד") - write them the way the brand writes them.
- Names of people and places.
- Slang and street language - keep it, don't "correct" it to formal Hebrew.
- Missing punctuation - add `?` and `!` where the voice clearly asks or punches; the beats depend on it.
