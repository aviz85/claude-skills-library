---
name: hermes-tweet
description: "Use Hermes Tweet for Hermes Agent X/Twitter automation through Xquik: discover endpoints, read social signals, check accounts, monitor launches, and perform approval-gated posting or engagement. Not affiliated with X Corp."
version: 0.1.8
author: Xquik
license: MIT
---

# Hermes Tweet

Native Hermes Agent plugin for X/Twitter automation through Xquik.

Use this skill when a Claude Code task needs a Hermes-ready X/Twitter plugin,
social listening, account reads, launch monitoring, trend checks, controlled
posting, replies, likes, retweets, follows, DMs, monitors, webhooks, draws,
extraction jobs, media, or agent workflow setup.

## Install

Recommended Hermes install:

```bash
hermes plugins install Xquik-dev/hermes-tweet --enable
```

If the plugin was installed but not enabled:

```bash
hermes plugins enable hermes-tweet
```

Hermes prompts for `XQUIK_API_KEY` during interactive install. For gateway,
cron, or non-interactive profiles, set `XQUIK_API_KEY` in the Hermes runtime
environment or `~/.hermes/.env`, then restart or reload the runtime.

## Tools

| Tool | Use |
|------|-----|
| `tweet_explore` | Discover catalog endpoints without an API call. |
| `tweet_read` | Call catalog-listed read-only endpoints after `XQUIK_API_KEY` is set. |
| `tweet_action` | Call write-like or private endpoints only when actions are enabled. |

Keep `tweet_action` disabled unless the workflow explicitly needs account
changes. Enable it only with:

```bash
export HERMES_TWEET_ENABLE_ACTIONS=true
```

## Workflow

1. Start with `tweet_explore` for the user's task.
2. Pick a catalog-listed `/api/v1/...` endpoint.
3. Use `tweet_read` for public or account read routes.
4. Use `tweet_action` only after naming the endpoint, payload, and account-changing effect.
5. Never pass API keys, session data, or credentials as tool arguments.

## Common Tasks

### Social Listening

Use `tweet_explore` to find search, user, trend, radar, monitor, or timeline
routes. Use `tweet_read` for the selected endpoint and summarize current signal.

### Launch Monitoring

Keep actions disabled. Schedule read-only trend, mention, account, and monitor
checks in Hermes cron or gateway sessions.

### Controlled Publishing

Before posting, replying, liking, following, DMing, or creating monitors, state
the exact action and payload. Confirm actions are enabled before calling
`tweet_action`.

### Gateway Or Desktop Profiles

Install Hermes Tweet where the Hermes runtime executes plugin code. Desktop is
only the chat surface unless it also runs the runtime locally.

## Safety Checklist

- Use `tweet_explore` before guessing endpoint paths.
- Keep API keys in environment variables or `~/.hermes/.env`.
- Leave `HERMES_TWEET_ENABLE_ACTIONS` unset or `false` for read-only work.
- Treat missing `tweet_read` as a setup issue, not as an install failure, when no API key is set.
- Treat missing `tweet_action` as expected until actions are explicitly enabled.

## Links

- Project: https://github.com/Xquik-dev/hermes-tweet
- PyPI: https://pypi.org/project/hermes-tweet/
- Guide: https://github.com/Xquik-dev/hermes-tweet#readme

Xquik is an independent third-party service. Not affiliated with X Corp. "Twitter" and "X" are trademarks of X Corp.
