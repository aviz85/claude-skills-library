---
name: calendar
description: "Google Calendar integration via Apps Script API. Use when checking schedule, meetings, today's events, weekly calendar, or adding events. Can help setup the API using clasp."
---

# Google Calendar Integration

Check and manage calendar events via Google Apps Script API.

## Quick Setup with Clasp

Clasp is Google's CLI for Apps Script. Install and deploy in minutes:

```bash
# Install clasp globally
npm install -g @google/clasp

# Login to Google
clasp login

# Create new project
mkdir calendar-api && cd calendar-api
clasp create --title "Calendar API" --type webapp
```

See [clasp-setup.md](references/clasp-setup.md) for full setup guide.

## Deploy the API

1. Copy the code from [calendar-api.gs](references/calendar-api.gs) to `Code.gs`
2. Set your secret token in the code
3. Push and deploy:

```bash
clasp push
clasp deploy --description "v1"
clasp deployments  # Get the URL
```

## API Usage

Base URL: Your deployed Apps Script URL
Auth: `?token=YOUR_SECRET_TOKEN`

### Actions

| Action | Description | Params |
|--------|-------------|--------|
| `today` | Today's events | - |
| `week` | This week's events | - |
| `upcoming` | Next N hours | `hours` (default: 4) |
| `range` | Date range | `start`, `end` (ISO dates) |
| `add` | Create event | `title`, `startTime`, `endTime`, `description` |

### Examples

```bash
# Today's events
curl "$URL?action=today&token=$TOKEN"

# Next 4 hours
curl "$URL?action=upcoming&hours=4&token=$TOKEN"

# This week
curl "$URL?action=week&token=$TOKEN"

# Date range
curl "$URL?action=range&start=2026-01-01&end=2026-01-07&token=$TOKEN"

# Add event
curl "$URL?action=add&title=Meeting&startTime=2026-01-15T10:00:00&endTime=2026-01-15T11:00:00&token=$TOKEN"
```

## Response Format

```json
{
  "count": 1,
  "events": [
    {
      "id": "event123",
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

## References

- [calendar-api.gs](references/calendar-api.gs) - The Apps Script code
- [clasp-setup.md](references/clasp-setup.md) - Full clasp setup guide
