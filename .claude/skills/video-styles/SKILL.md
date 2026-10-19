---
name: video-styles
description: Edit a talking-head video shot on a phone into one of 10 signature Hebrew-first editing styles, rendered locally with HyperFrames - 1 מסלול (route), 2 שער של מגזין (magazine cover), 3 אפקט Vertigo (dolly zoom), 4 קו מצויר (hand-drawn line), 5 קיר כותרות (headline wall), 6 קולאז' נייר (paper collage), 7 אותיות זכוכית (glass letters), 8 קו חי (living line), 9 צ'אט שמקליד (typing chat), 10 טיסה במפה (map flight). Use when the user says "ערוך לי את הסרטון", "תעשה לי סגנון", "קיר כותרות", "שער של מגזין", "סגנון 5", "edit my reel in style X", "make my phone video look like...", names any of the 10 styles, or drops a phone video and asks for an edit.
---

# Video Styles

Take a raw talking-head video from the phone and turn it into a styled reel in ONE prompt. The footage plays untouched underneath - the style is designed graphics, cutouts and camera moves layered on top, synced to what is said. Hebrew and RTL are first-class.

Built on the HyperFrames skills in this repo. This skill owns the style decisions; HyperFrames owns the composition contract and the render.

## The 10 styles - pick one

| # | Style | What the viewer sees | Best for | Needs cutout |
|---|---|---|---|---|
| 1 | מסלול - Route | A path draws across the frame, a marker travels it, stops pop as each step is said | Processes, "3 steps", journeys | Yes (path goes behind you) |
| 2 | שער של מגזין - Magazine cover | You become a magazine cover - masthead behind your head, coverlines appear as topics come up | Hooks, personal brand, big statements | Yes |
| 3 | אפקט Vertigo - Dolly zoom | You stay locked in size while the room pulls away behind you | The one line that hits hardest, realisations | Yes |
| 4 | קו מצויר - Drawn line | Marker doodles draw on screen - circles, arrows, underlines, scribbles | Teaching, pointing at ideas, playful tone | Optional |
| 5 | קיר כותרות - Headline wall | Paper notes with headlines slap onto the wall behind you until it's full | Social proof, quotes, lists of pains or wins | Yes |
| 6 | קולאז' נייר - Paper collage | Torn paper, ransom-note letters, sticker-outline cutout of you, stop-motion feel | Stories, personality, creative niches | Yes |
| 7 | אותיות זכוכית - Glass letters | Huge frosted-glass words with light sweeping through, behind and in front of you | Premium feel, one-word punches, launches | Yes |
| 8 | קו חי - Living line | One continuous line that never breaks - becomes an underline, an arrow, a chart, a heartbeat | Growth stories, data, before/after | Optional |
| 9 | צ'אט שמקליד - Typing chat | Chat bubbles + typing dots next to you, as if the conversation is happening live | Objections, DMs, client questions, dialogues | No |
| 10 | טיסה במפה - Map flight | A map takes over, a plane flies A to B on an arc, lands with a pop | Travel, relocation, "from X to Y" transformations | Optional |

Full recipe for each (layers, motion, fonts, palette, registry blocks, pitfalls): [references/styles.md](references/styles.md).
Ready-to-paste Hebrew prompts, one per style: [references/prompts-he.md](references/prompts-he.md).

## Step 0 - Load context

1. Read `brand/brand-brief.md` if it exists - pull brand colors, voice and CTA. Don't block on it.
2. Confirm the inputs. Ask only what's missing:
   - **Video file** - absolute path. Phone vertical footage is the default.
   - **Style** - number or name from the table. "תבחר אתה" = read the transcript first, then recommend ONE style with a one-line why.
   - **Aspect** - default 9:16 (1080x1920). Offer 4:5 only if asked.
   - **Captions too?** - default no. If yes, add them after the style is built via `/embedded-captions` (`anchor` identity) so they don't fight the style.
3. Read the chosen style's section in `references/styles.md` and `references/hebrew-rtl.md` before writing any HTML.

## Step 1 - Check the machine

```bash
npx hyperframes doctor      # ffmpeg, headless Chrome, render deps
```

Needs Node 22+, `ffmpeg`/`ffprobe`. On macOS set `export PRODUCER_BROWSER_GPU_MODE=hardware` before rendering. First runs download models once (Whisper for transcription, ~168 MB for background removal).

## Step 2 - Work directory + footage prep

```bash
VIDEO_PATH="/absolute/path/my-reel.mov"
WORK_DIR="videos/$(basename "$VIDEO_PATH" | sed 's/\.[^.]*$//')"
mkdir -p "$WORK_DIR/public/fonts" "$WORK_DIR/public/cards"

ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate \
  -show_entries format=duration -of json "$VIDEO_PATH" > "$WORK_DIR/metadata.json"
ffmpeg -y -i "$VIDEO_PATH" -vn -acodec libmp3lame -q:a 2 "$WORK_DIR/audio.mp3"

# Dense keyframes or the renderer freezes on seek. Match -g to the fps.
ffmpeg -y -i "$VIDEO_PATH" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  -c:v libx264 -crf 18 -g 30 -keyint_min 30 -pix_fmt yuv420p -movflags +faststart -c:a aac \
  "$WORK_DIR/public/input-video.mp4"

cp -n "<SKILL_DIR>/assets/fonts/"* "$WORK_DIR/public/fonts/"   # SKILL_DIR = this skill's base directory
```

iPhone `.mov` in HDR/HEVC is fine - the re-encode above normalises it.

## Step 3 - Transcribe in Hebrew

```bash
npx hyperframes transcribe "$WORK_DIR/audio.mp3" -d "$WORK_DIR" --json --model medium --language he
```

- NEVER use a `.en` model on Hebrew - it silently translates to English.
- `medium` is the floor for Hebrew quality. Use `large-v3` for the final cut if the machine can take it.
- Output is a flat word array `[{ "text", "start", "end" }]`. Fix ASR mistakes in place (names, slang, English words said in Hebrew), keep the timestamps. Clamp every end time to the real duration in `metadata.json`.

## Step 4 - Cutout (styles 1, 2, 3, 5, 6, 7 - and optional for 4, 8, 10)

```bash
npx hyperframes remove-background "$WORK_DIR/public/input-video.mp4" -o "$WORK_DIR/public/cutout.webm" --quality balanced
```

Use `--quality fast` while iterating and `--quality best` for the final render.

The cutout is what lets graphics sit BEHIND you. Layer order is always:
`input-video.mp4` (z1, carries the audio) -> style graphics that go behind (z2) -> `cutout.webm` (z3, muted) -> graphics in front (z4).

- Snapshot 2-3 frames and check the matte: hair, hands, held objects. Held phones/products can drop out of the matte - keep hero text away from them.
- Put the opacity/transform on a WRAPPER around the cutout video, never on the `<video>` itself. Pattern: `/hyperframes-creative` -> `references/composition-patterns.md` -> "Text Behind Subject".

## Step 5 - Beat map

Read the transcript and pick the beats the style hangs on. Write them to `$WORK_DIR/beats.json`:

```json
[
  { "id": "b1", "at": 0.4, "end": 3.2, "text": "העתיד זה כאן!", "role": "hook" },
  { "id": "b2", "at": 6.1, "end": 9.0, "text": "עדן אתה אלוף", "role": "proof" }
]
```

- **Hook beat in the first 1.5 seconds** - every style must show something in the first second.
- Pace: under 60s = a beat every 4-7s. 60s-3min = every 7-12s. Minimum 5 beats.
- Beat text = the speaker's actual words, shortened to 2-6 words. Don't invent claims the speaker didn't make.
- One "hero" beat per video gets the biggest move (the Vertigo, the masthead slam, the plane landing).

## Step 6 - Build

1. Read `/hyperframes-core` before writing composition HTML - it is the contract (one paused GSAP timeline at `window.__timelines["<id>"]`, `data-start`/`data-duration`/`data-track-index`, `class="clip"`, no randomness or network at render time).
2. Check the registry BEFORE hand-building anything named in the recipe: `npx hyperframes catalog --query "<the effect in plain English>"`, then `npx hyperframes add <name>`. Adapt the block to RTL and Hebrew fonts - don't ship it with Latin defaults.
3. Build the composition in `$WORK_DIR/public/index.html` following the style recipe. Root: `data-width="1080" data-height="1920" data-fps="30"`, `<html lang="he" dir="rtl">`.
4. Link the fonts: `<link rel="stylesheet" href="fonts/fonts.css">` and list concrete font names in `body { font-family: ... }`.
5. Seeded randomness only (rotations, jitter): use a fixed seed helper, never `Math.random()`.
6. Camera moves (punch-in, Vertigo, map zoom) -> load `/hyperframes-keyframes`. Motion choices -> `/hyperframes-animation`. Sound effects (whoosh, paper slap, plane, typing) -> `/media-use` (`resolve --type sfx` needs no account).

## Step 7 - Check before render

```bash
cd "$WORK_DIR"
npx hyperframes lint public
npx hyperframes check public
npx hyperframes snapshot public --at 1,<hero beat>,<last beat>
```

Look at the snapshots yourself:
- Hebrew reads right-to-left, no reversed numbers or flipped punctuation.
- Nothing important under the Instagram/TikTok UI: keep text out of the top 220px and bottom 380px, and away from the right 140px (buttons).
- Text that goes behind the cutout is still readable - no hero word more than ~30% hidden.
- First frame is not empty.

## Step 8 - Preview, then render

```bash
npx hyperframes preview public --background      # user can tweak text/timing in Studio
npx hyperframes render public -o output.mp4 --fps 30 --quality delivery
```

Render length comes from the root `data-duration` - set it to the video duration.

## Step 9 - Report

Tell the user, short:
- The style used + why (one line)
- Path to `output.mp4`
- The beats you used (list)
- Anything to check: matte glitches, words you weren't sure about in the transcript
- Next: `/post-writer` for the caption, `/post-scheduler` to publish

## Rules

- The footage is sacred - never cut, reorder or speed-ramp it in this skill. That's a different job (`/general-video`).
- One style per video. Mixing two styles reads as a template pack, not a brand.
- Hebrew first: all on-screen copy in Hebrew unless the speaker said it in English.
- Short hyphens only in on-screen copy (-), never em-dashes.
- If a step fails (doctor, transcribe, render), show the error and stop - don't guess around it.
