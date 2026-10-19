# Build Skills - Content System for Claude Code

Claude Code skills that take you from "I don't know what to post" to an edited, scheduled post.

## Content skills

| Skill | What it does |
|---|---|
| `/brand-brief` | Captures what you sell, who buys, your CTA and voice. Saves to `brand/brand-brief.md` |
| `/content-coach` | Walks a beginner end-to-end: brief -> ideas -> write -> grade -> schedule |
| `/post-writer` | Hook + body + CTA, sized for each platform |
| `/post-grader` | Virality score out of 100 (hook = 50%) + exact fixes + rewrite |
| `/post-scheduler` | Schedules to one or many platforms via the Blotato API |
| `/repurpose` | One long-form piece -> 3 platform-native posts |
| `/viral-hooks` | 100 hook templates across 13 categories |

## Video editing

| Skill | What it does |
|---|---|
| `/video-styles` | Edits a phone talking-head video into one of 10 Hebrew-first styles: מסלול, שער של מגזין, אפקט Vertigo, קו מצויר, קיר כותרות, קולאז' נייר, אותיות זכוכית, קו חי, צ'אט שמקליד, טיסה במפה |
| `/hyperframes` | HyperFrames entry point - any video made from HTML, rendered locally to MP4 |
| `/talking-head-recut` | Designed graphic cards over an existing talking-head video |
| `/embedded-captions` | Captions on talking-head footage, including captions behind the speaker |

Plus the HyperFrames domain skills (`hyperframes-core`, `-cli`, `-animation`, `-keyframes`, `-creative`, `-audio`, `-registry`, `-studio`, `media-use`) that the workflows load on demand. Source and license: [THIRD_PARTY.md](THIRD_PARTY.md).

Ready-to-paste Hebrew prompts for each style: [.claude/skills/video-styles/references/prompts-he.md](.claude/skills/video-styles/references/prompts-he.md).

## Setup
1. Open this folder in Claude Code - skills load from `.claude/skills/`.
2. Run `/brand-brief` first. Every other skill reads it.
3. For scheduling: set the `BLOTATO_API_KEY` env var (Blotato -> Settings -> API).
4. For video: install Node 22+ and `ffmpeg` (`brew install node ffmpeg` on Mac), then run `npx hyperframes doctor`. Rendering runs on your machine - first run downloads the transcription and background-removal models once.
5. Optional: HyperFrames sends anonymous usage telemetry. Turn it off with `npx hyperframes telemetry disable` or `export HYPERFRAMES_NO_TELEMETRY=1`.

## Start here
- Content: run `/content-coach`.
- Video: drop your phone video and run `/video-styles`.
