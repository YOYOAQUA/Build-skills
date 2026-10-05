# Build Skills - Content System for Claude Code

7 Claude Code skills that take you from "I don't know what to post" to a scheduled post.

| Skill | What it does |
|---|---|
| `/brand-brief` | Captures what you sell, who buys, your CTA and voice. Saves to `brand/brand-brief.md` |
| `/content-coach` | Walks a beginner end-to-end: brief -> ideas -> write -> grade -> schedule |
| `/post-writer` | Hook + body + CTA, sized for each platform |
| `/post-grader` | Virality score out of 100 (hook = 50%) + exact fixes + rewrite |
| `/post-scheduler` | Schedules to one or many platforms via the Blotato API |
| `/repurpose` | One long-form piece -> 3 platform-native posts |
| `/viral-hooks` | 100 hook templates across 13 categories |

## Setup
1. Open this folder in Claude Code - skills load from `.claude/skills/`.
2. Run `/brand-brief` first. Every other skill reads it.
3. For scheduling: set the `BLOTATO_API_KEY` env var (Blotato -> Settings -> API).

## Start here
Run `/content-coach`.
