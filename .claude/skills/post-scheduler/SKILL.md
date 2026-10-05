---
name: post-scheduler
description: Schedule a finished social post to one or more platforms via the Blotato API. Handles single-platform and multi-platform posts, media uploads, per-platform tweaks, publish-now or a scheduled time, and status checks. Use when the user says "schedule this", "post this to Instagram and LinkedIn", "publish tomorrow at 9", or "send it to Blotato".
---

# Post Scheduler (Blotato)

Push a finished post to Blotato so it publishes now or at a set time.

## Setup (first run)

1. Needs env var `BLOTATO_API_KEY` (from Blotato -> Settings -> API). If missing, stop and tell the user where to get it. Never ask them to paste the key into chat - have them set it as an env var / environment secret.
2. Accounts must already be connected inside Blotato.

## API basics

- Base URL: `https://backend.blotato.com/v2`
- Auth header: `blotato-api-key: $BLOTATO_API_KEY` (keep any trailing `=` in the key)
- `Content-Type: application/json`

> Blotato updates its API. If a call returns 4xx with a schema error, read the error message, adjust the field, and check https://help.blotato.com/api before retrying. Don't loop blind.

## Step 1 - Confirm the job

Collect and confirm in one message:
- **Post text** (final - suggest `/post-grader` first if it wasn't graded)
- **Platforms** (twitter, linkedin, facebook, instagram, tiktok, threads, bluesky, pinterest, youtube)
- **Media** (image/video URLs or local files) - required for instagram, tiktok, youtube, pinterest
- **When** - "now" or a date/time + timezone. Convert to ISO 8601 UTC (e.g. `2026-10-06T06:00:00Z`)

## Step 2 - Get account IDs

```bash
curl -s "https://backend.blotato.com/v2/users/me/accounts" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
# optional filter: ?platform=instagram
```

Map each platform to its `id`. For Facebook pages and LinkedIn company pages, fetch sub-accounts:

```bash
curl -s "https://backend.blotato.com/v2/users/me/accounts/<accountId>/subaccounts" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

If a platform has multiple accounts, ask which one.

## Step 3 - Upload media (if any)

Blotato needs media hosted on its side. Upload by public URL:

```bash
curl -s -X POST "https://backend.blotato.com/v2/media" \
  -H "blotato-api-key: $BLOTATO_API_KEY" -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/image.jpg"}'
# -> { "url": "https://database.blotato.com/..." }
```

Use the returned `url` in `mediaUrls`. Local files need a public URL first (ask the user to upload to Drive/Dropbox/S3 with a public link).

## Step 4 - Create the post (one call per platform)

```bash
curl -s -X POST "https://backend.blotato.com/v2/posts" \
  -H "blotato-api-key: $BLOTATO_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "post": {
      "accountId": "<accountId>",
      "content": {
        "text": "<post text>",
        "mediaUrls": ["<blotato media url>"],
        "platform": "instagram"
      },
      "target": { "targetType": "instagram" }
    },
    "scheduledTime": "2026-10-06T06:00:00Z"
  }'
# -> { "postSubmissionId": "..." }
```

Omit `scheduledTime` to publish immediately.

### Platform-specific `target` fields

| Platform | Extra target fields |
|---|---|
| facebook | `pageId` (required - from subaccounts) |
| linkedin | `pageId` (optional - only for company pages) |
| instagram | `mediaType`: `"reel"` or `"story"` (optional, default feed/reel by media) |
| tiktok | `privacyLevel` (`PUBLIC_TO_EVERYONE`), `disabledComments`, `disabledDuet`, `disabledStitch`, `isBrandedContent`, `isYourBrand`, `isAiGenerated` (all booleans, required) |
| youtube | `title`, `privacyStatus` (`public`/`unlisted`/`private`), `shouldNotifySubscribers` |
| pinterest | `boardId` (required) |
| twitter / threads / bluesky | none required |

### Threads (X thread, Threads, Bluesky)
Put the first post in `content.text` and the rest in `content.additionalPosts`: `[{"text": "...", "mediaUrls": []}]`.

## Multi-platform posts

Don't send identical text everywhere. Before scheduling, adapt per platform:
- **X/Bluesky** - trim to 280/300 chars, or convert to a thread
- **LinkedIn** - no hashtag spam, line breaks, link in first comment instead of body
- **Instagram/TikTok** - caption + 3-5 hashtags, media required
- **Threads** - <= 500 chars

Show the per-platform versions in a table, get one "yes", then fire all calls.

## Step 5 - Confirm status

```bash
curl -s "https://backend.blotato.com/v2/posts/<postSubmissionId>" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

Report back as a table:

| Platform | Account | When (user's timezone) | Status | Submission ID |
|---|---|---|---|---|

## Rules
- Always confirm before calling POST /posts - publishing is public and hard to undo.
- Always show times in the user's timezone, send UTC to the API.
- Never print the API key in output or logs.
- On failure, report the platform, the error message, and the fix - don't silently skip.
