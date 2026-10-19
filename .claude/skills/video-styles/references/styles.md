# The 10 Style Recipes

Every recipe assumes a 1080x1920 canvas at 30fps, `input-video.mp4` full-bleed on track 1 (it carries the audio), and the layer order from SKILL.md Step 4. "Behind" = between the video and the cutout. "Front" = above the cutout.

Shared helpers used below:

```js
// Seeded random - deterministic across renders. Never Math.random().
function seeded(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
const rnd = seeded(42);
// Snap a time to the frame grid
const q = (t) => Math.round(t * 30) / 30;
```

Safe zone for text on a 9:16 reel: x 60-940, y 220-1540. Hero text that goes behind the head can sit higher (y 120+), because the head itself sits in the UI-free band.

---

## 1. מסלול - Route

**Look.** A thick path (dashed or solid) draws itself across the frame in a winding S-curve, partly behind the speaker. A marker (dot, pin or small icon) travels along it. At each step the speaker names, a stop appears on the path: a numbered circle + a 2-4 word label.

**When.** "3 steps to...", a process, a journey from A to B, a timeline of a career.

**Layers.** Path + traveler: behind. Stop labels: front (so they're never hidden by the body).

**Build.**
1. One SVG `<path>` covering the whole frame, 18-24px stroke, round caps. Shape it so it passes behind the torso at least once - that's what sells the depth.
2. Stops = beats with role `step`. Place each stop on the path at an increasing length fraction (`path.getPointAtLength`).
3. Draw-on: animate `strokeDashoffset` from full length to the stop's length fraction, timed so the line reaches each stop exactly at that beat's `at`.
4. Traveler: `npx hyperframes catalog --query "object follows an svg path"` -> `offset-path-traveler` or `arc-motion-path`. Sync its progress to the same draw-on tween.
5. Stop: circle scales 0 -> 1.15 -> 1 (`back.out(2)`), number inside, label slides in from the RIGHT (RTL) with 0.1s delay.

**Motion.** Draw segments with `power2.inOut`, 0.6-1.2s each. Hold still between steps - the line moving constantly is noise.

**Type & color.** Labels in Heebo 800, 54-64px, dark text on a white pill. Path in the brand accent. Numbers in Secular One.

**Pitfalls.** Labels near the right edge collide with the IG buttons - keep stops x < 940. Don't let the final stop land under the caption zone (y > 1540).

---

## 2. שער של מגזין - Magazine cover

**Look.** The frame turns into a magazine cover. A giant masthead across the top sits BEHIND the speaker's head. Coverlines appear around the body as topics come up. Small details sell it: issue number, date, price, barcode in the corner, a thin border.

**When.** Hook of a personal-brand video, "the story of...", bold statements, launches.

**Layers.** Masthead: behind. Coverlines, barcode, issue line: front.

**Build.**
1. Masthead = brand name or the video's big idea, 1-2 words. Frank Ruhl Libre 900 or Karantina 700, 260-340px, letter-spacing tight, fills the full width. Position so the head overlaps its bottom 30-50%.
2. Coverlines = 3-5 beats. Each: a small kicker (Heebo 800, 30px, accent color, uppercase-feel) + a line (Heebo 900, 48-60px). Alternate left/right columns, right column first (RTL reading order).
3. Issue strip under masthead: `גיליון 07 · אוקטובר 2026` in Heebo 400 28px. Barcode bottom-left: a block of thin vertical bars from a seeded generator + a price `₪29.90`.
4. Optional "cover grade": slight contrast lift + warm tint via `/media-use` treatments, not a CSS filter on the video.

**Motion.** Hook beat: masthead slams down (`y: -120 -> 0`, `scale 1.08 -> 1`, 0.45s `expo.out`) with a 3-frame shake (see `headline-slam` component). Coverlines: clip-path wipe from right to left, 0.35s each, on their beat. Everything else is static - magazines don't wiggle.

**Type & color.** Masthead in one strong color (red #E10600, white, or brand). Max 2 accent colors on the cover.

**Pitfalls.** A masthead fully hidden by the head is unreadable - test with a snapshot at the hero frame. If the speaker moves a lot, keep the masthead higher.

---

## 3. אפקט Vertigo - Dolly zoom

**Look.** The speaker holds still in frame while the room behind them stretches away - the Hitchcock "Vertigo" shot. Used once, on the hardest line in the video.

**When.** The realisation moment, the punchline, "and then I understood...".

**Layers.** Background (input video): scaled. Cutout: locked. Optional single word: behind.

**Build.**
1. Requires a STEADY shot (tripod or phone on a surface) during the hero beat. If the camera moves in that window, pick another beat or skip this style - tell the user.
2. Before the hero beat, punch both layers in to `scale: 1.35` around the subject's center (find it from a cutout snapshot - the head/chest midpoint). Do it with a soft 0.4s punch-in, or start the whole video punched in.
3. Hero beat (1.5-3s): the BACKGROUND wrapper scales 1.35 -> 1.0 while the CUTOUT wrapper stays at 1.35. Use `power2.inOut`. Add 2-4px blur ramp on the background during the move.
4. Zooming the background OUT keeps the background copy of the speaker smaller than the cutout - it stays hidden behind them. Zooming IN would leave a visible ghost halo - avoid that direction unless the user gives a clean plate (a few seconds of the empty room).
5. Snap back after the beat with a fast 0.25s cut-style ease, or hold the new frame.
6. `npx hyperframes catalog --query "dolly zoom"` - `camera-dolly-zoom` shows the move on a 3D scene; borrow its timing curve, not its geometry.

**Motion.** Load `/hyperframes-keyframes`. Animate wrappers, never the `<video>`. Add a low whoosh/riser SFX under the move (`/media-use resolve --type sfx`).

**Type & color.** Optional: one word (Heebo 900, 200px) appears behind the speaker at the end of the move.

**Pitfalls.** 1.35x punch on 1080p footage softens the image - recommend shooting 4K for this style. Big hand gestures during the move can peek the ghost - choose a beat where the hands are low.

---

## 4. קו מצויר - Drawn line

**Look.** White or yellow marker strokes draw on screen as if someone is annotating the video live: a circle around the head, an arrow pointing at the speaker, a squiggle underline under a key word, a scribble crossing out a wrong belief.

**When.** Teaching, myth-busting, pointing at an idea, playful tone.

**Layers.** Most strokes: front. One stroke that wraps around the head or body: half behind, half front (duplicate the path, clip one copy to the back layer) - that's the signature move.

**Build.**
1. `npx hyperframes catalog --query "hand drawn underline circle arrow"` -> `hw-underline`, `hw-callout-circle`, `outline-draw`, `hw-scribble-transition`. Use them before hand-drawing.
2. Each beat gets ONE drawn gesture + 1-4 handwritten words (Amatic SC 700, 90-120px - it's thin, go big).
3. Wobble: add seeded ±3px jitter to path points so strokes look hand-made. Two passes for circles (the second pass slightly offset) reads as real marker.
4. Myth beat: strike-through scribble across the words, then the corrected word draws below.

**Motion.** Stroke draw 0.35-0.6s `power1.inOut` (markers are fast). Word appears right after its stroke. Strokes stay 1.5-3s, then fade 0.2s - don't let the screen fill up.

**Type & color.** Marker colors: #FFFFFF, #FFE14D, #FF4D4D. Stroke width 10-14px, round caps, slight `drop-shadow(0 2px 6px rgba(0,0,0,.35))` for contrast on busy backgrounds.

**Pitfalls.** Handwriting in Hebrew draws right-to-left - if you animate a reveal, the mask must open from the right.

---

## 5. קיר כותרות - Headline wall

**Look.** The wall behind the speaker fills up with paper notes - torn notebook pages, sticky notes, newspaper clippings - each carrying a short headline from what's being said. They slap on one by one, slightly rotated, with tape on top, and they sit BEHIND the speaker's head and shoulders. By the end the wall is full.

**When.** Social proof ("people told me..."), quotes, a list of pains or wins, "what they say about me".

**Layers.** Notes: behind. Optional small numbered tag (like the red `5` badge) + style title bar: front, bottom-center.

**Build.**
1. 5-9 notes. Each = one beat, 2-6 words, written like a quote or a headline: `העתיד זה כאן!`, `תודה לך, אתה מקצוען`.
2. Grid them around the head: two columns flanking the head + 1-2 above. Seeded rotation ±3-6°, seeded offset ±20px. Later notes can overlap earlier ones (z-order by time).
3. Paper variety (rotate through): cream notebook `#F4EBD0` with faint lines, yellow sticky `#FFE873`, white torn edge (`clip-path` polygon with seeded jagged bottom), newsprint `#ECE6D8` with a thin rule.
4. Tape: a 90x28px semi-transparent beige rect `rgba(232,220,190,.8)` at the top, rotated a few degrees off the note.
5. Text: Amatic SC 700 for handwritten notes, Secular One for printed headlines. Size so each note holds 2-3 lines max.
6. Shadow: `0 8px 18px rgba(0,0,0,.28)` - the shadow is what sells "on the wall".

**Motion.** Slap-on: from `scale 1.25, opacity 0, rotation +8°` -> `scale 1, rotation final`, 0.22s `power3.out`, then a 0.12s settle (`scale 0.98 -> 1`). Paper slap SFX per note. Notes never leave - the wall accumulates.

**Type & color.** Dark ink `#1E1E1E` on paper. One note can be the accent (red pen) for the hero beat.

**Pitfalls.** Notes behind the head must keep their key word outside the silhouette - check snapshots at each note's landing frame. Keep notes clear of the right 140px.

---

## 6. קולאז' נייר - Paper collage

**Look.** Analog cut-and-paste: the speaker gets a thick white "sticker" outline, torn paper shapes and halftone scraps frame them, headlines are built from mixed cut-out letters (ransom-note style), and transitions rip the frame like paper. Slight stop-motion jitter.

**When.** Personal stories, creative niches, anything that should feel handmade and anti-corporate.

**Layers.** Paper scraps + background shapes: behind. Sticker outline on the cutout (the cutout itself with filters). Ransom headlines: front.

**Build.**
1. Sticker outline: on the cutout WRAPPER, stack `filter: drop-shadow(0 0 0 #fff)` ×4 at 3px offsets in each direction, plus a soft `drop-shadow(0 10px 20px rgba(0,0,0,.35))`.
2. `npx hyperframes catalog --query "torn paper"` -> `paper-collage-reveal` for the open, `torn-paper-rip` between sections.
3. Ransom headline: split the beat text into letters, each in a small paper box with a seeded pick of font (Karantina / Frank Ruhl Libre / Secular One / Rubik), seeded paper color (white, kraft `#C8A27A`, black with white text, red `#D7263D`), seeded rotation ±6°. Letters stay in RTL order - see `hebrew-rtl.md` on splitting.
4. Background scraps: 4-6 torn-edge polygons behind the speaker in muted colors, with a halftone dot pattern (CSS `radial-gradient` repeat).

**Motion.** Stop-motion: quantize graphic motion to 12fps steps (`ease: "steps(N)"` or snap tween times to 1/12s). Letters pop in one by one right-to-left, 0.05s apart. Rip transitions on section changes.

**Type & color.** Mixed by design, but cap the palette at 4 paper colors + black + white.

**Pitfalls.** Too many scraps bury the speaker - the face must stay the brightest, cleanest area.

---

## 7. אותיות זכוכית - Glass letters

**Look.** Huge frosted-glass words float in the scene - the room shows through them blurred, with a bright rim on the edges and a light streak sweeping across. One word can sit behind the speaker, another in front.

**When.** Premium positioning, launches, one-word punches ("שקט." "מיקוד." "עכשיו.").

**Layers.** Behind-word: behind. Front-word (optional, smaller): front.

**Build.**
1. `npx hyperframes catalog --query "glass text"` -> `glass-shard-title`, `glass-hero`, `vfx-liquid-glass`. Prefer adapting one of these.
2. Hand-built fallback per letter block: `color: rgba(255,255,255,.18)`, `-webkit-text-stroke: 2px rgba(255,255,255,.75)`, `text-shadow: 0 0 24px rgba(255,255,255,.35)`, and a glass plate behind the word with `backdrop-filter: blur(18px) saturate(140%)` clipped to the text shape (or a rounded plate if clipping isn't possible).
3. Light sweep: a skewed white gradient bar masked to the text (`background-clip: text` on a copy) moving right-to-left across the word in 0.8s.
4. Font: Heebo 900 or Secular One, 240-380px. One or two words max per beat.

**Motion.** Rise in: `y 80 -> 0`, `opacity 0 -> 1`, `blur 12px -> 0`, 0.7s `expo.out`. Slow drift up 20px while held. Exit with the sweep then fade.

**Type & color.** Works best over darker footage. On a bright room, darken the background slightly during the word (a 0.15 black overlay behind the glass).

**Pitfalls.** `backdrop-filter` is heavy - check render time on the first draft. Verify the glass reads in a snapshot; if it disappears into a white wall, switch to a tinted glass (`rgba(30,30,40,.25)` fill).

---

## 8. קו חי - Living line

**Look.** ONE continuous line lives through the whole video. It never breaks: it underlines a word, bends into an arrow, climbs into a growth chart, flatlines, jumps into a heartbeat, wraps around the speaker - always the same stroke, morphing from shape to shape on the beats.

**When.** Growth stories, numbers, before/after, energy shifts. Also strong for wellness/health topics (the heartbeat move).

**Layers.** Mostly front. When it wraps around the body: behind + front split, same trick as style 4.

**Build.**
1. Plan a "shape per beat" list: `underline -> arrow -> chart-up -> flat -> heartbeat -> circle -> final underline under CTA`.
2. Keep a constant point count across all shapes (e.g. 64 points) so you can tween between them point-by-point - a single `<path>` whose `d` is rebuilt from interpolated points in an `onUpdate`. Deterministic: progress comes from the timeline, nothing else.
3. Chart beats: `npx hyperframes catalog --query "line graph draws on"` -> `mk-line-graph` / `decline-chart` for the label and dot styling; keep the line itself as YOUR continuous path.
4. A glowing head dot rides the leading end of the line at all times.
5. Numbers the speaker says ride the line as count-ups (Heebo 900).

**Motion.** Morph 0.5-0.8s `power2.inOut` per beat. Between beats the line breathes: tiny seeded wave along its points, amplitude 3-5px. Optional: drive the wave by the voice loudness (`/hyperframes-creative` audio-reactive reference).

**Type & color.** Line 10-14px, one bright color with a glow (`drop-shadow(0 0 10px <color>)`): electric green #39FF88, hot pink #FF3D7F or brand accent.

**Pitfalls.** If the line jumps instead of morphing, the point counts differ - resample every shape to the same count.

---

## 9. צ'אט שמקליד - Typing chat

**Look.** A chat conversation plays next to the speaker: typing dots, then a bubble pops in; the speaker "answers" out loud. Can be the viewer's DM, a client's question, an inner voice, or the speaker's own messages.

**When.** Handling objections, "a client sent me this...", DMs, before/after conversations, inner-dialogue hooks.

**Layers.** Chat panel: front. The speaker can stay full-frame with the chat floating over the lower-middle, or slide up (video wrapper `y` up 0-15%) to give the chat room.

**Build.**
1. `npx hyperframes catalog --query "chat bubbles typing indicator"` -> `chat-thread`, `chat-message`, `typing-indicator`, `message-thread-reveal`.
2. Messages = beats. Incoming = the question/objection, outgoing = the speaker's answer in 3-8 words. The speaker's spoken words land AFTER the bubble, not before.
3. RTL: Hebrew chat apps mirror the layout - match the side and tail direction to a real Hebrew-UI screenshot of the app you're imitating. Bubble text `dir="rtl"`, timestamps and ✓✓ ticks on the left of the bubble.
4. Typing an input field: reveal characters by setting `textContent` to a substring whose length comes from the tween progress (`Math.floor(p * text.length)`), with a caret. No `setTimeout`.
5. Generic UI only - no real app logos or names unless the user owns the account; fake a WhatsApp/iMessage look without the brand marks.

**Motion.** Typing dots 0.6-1.2s, bubble pop from its corner (`scale 0.75 -> 1`, 0.12s), thread scrolls up smoothly when full. Message sound per bubble.

**Type & color.** Rubik 500 for bubbles at 40-46px (phones read small text badly in reels). Incoming `#FFFFFF`, outgoing brand-tinted or WhatsApp-like `#D9FDD3`.

**Pitfalls.** Too many bubbles on screen = unreadable. Max 4 visible at once.

---

## 10. טיסה במפה - Map flight

**Look.** A map takes over the screen (or sits behind the cutout speaker), the camera eases in on the origin, a plane takes off and flies an arc with a dashed trail, the camera follows, and it lands on the destination with a pin pop.

**When.** Travel, relocation, "from Tel Aviv to NY", or a metaphorical journey (origin `שכיר`, destination `עצמאי`) on a stylised map.

**Layers.** Option A - full takeover: the map covers the frame for 3-6s while the voice continues, video returns after the landing. Option B - map behind the cutout speaker for the whole beat.

**Build.**
1. `npx hyperframes catalog --query "plane flying between cities on a map"` -> `nyc-paris-flight` (realistic map + plane + landing pop + SFX), `world-map`, `us-map-flow`. Retarget the cities.
2. Labels in Hebrew: city names in Heebo 800 with a white pill. Distances/times as count-ups if the speaker says them.
3. Metaphorical version: a minimal map (land shapes in two tones, no real borders) with invented place names from the story.
4. Map tiles or data must be LOCAL files in the project - no network at render time.

**Motion.** Camera ease-in on origin 0.8s -> takeoff -> flight 2-3s along the arc (`power1.inOut`), camera follows with a slight zoom-out mid-flight -> land, pin bounce (`back.out(2)`), destination label. Plane SFX.

**Type & color.** Map in muted tones so the route line (brand accent, 8px, dashed trail) pops.

**Pitfalls.** A takeover longer than ~6s loses the face - and the face is what holds attention in a talking-head reel. Return to the speaker fast.
