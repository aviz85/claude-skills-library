---
name: calendar
description: "Google Calendar integration via Apps Script API. Use when checking schedule, meetings, today's events, or weekly calendar."
---

# Google Calendar Integration

Check calendar events via Google Apps Script API.

## API Endpoints

Base URL: `YOUR_GOOGLE_APPS_SCRIPT_URL`

Auth token: `YOUR_AUTH_TOKEN`

> **Setup Required**: Deploy your own Google Apps Script with calendar access and configure the URL and token above.

### Actions

| Action | Description | Extra Params |
|--------|-------------|--------------|
| `today` | Get today's events | - |
| `week` | Get this week's events | - |
| `upcoming` | Get events in next N hours | `hours` (default: 4) |
| `range` | Get events in date range | `start`, `end` (ISO dates) |

### Usage

```bash
# Today's events
curl "$URL?action=today&token=$TOKEN"

# Next 4 hours
curl "$URL?action=upcoming&hours=4&token=$TOKEN"

# This week
curl "$URL?action=week&token=$TOKEN"
```

## When to Use

- During `/standup` - check calendar before planning day
- When user asks about meetings or schedule
- To verify availability before scheduling

## Response Format

```json
{
  "count": 1,
  "events": [
    {
      "title": "Meeting Name",
      "start": "2026-01-04T09:00:00.000Z",
      "end": "2026-01-04T10:00:00.000Z",
      "location": "Zoom link or address",
      "description": "Meeting details",
      "isAllDay": false,
      "guests": ["email@example.com"]
    }
  ]
}
```

## Integration with Task System

When checking calendar during standup:
1. Fetch today's events
2. Compare with tasks in today.md
3. Flag any meetings not in task list
4. Suggest adding missing meetings as tasks
