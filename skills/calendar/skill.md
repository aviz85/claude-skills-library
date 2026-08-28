---
name: calendar
description: "Google Calendar integration via Apps Script API. Use when checking schedule, meetings, today's/tomorrow's events, weekly calendar, or creating/deleting events across all calendars."
version: "2.0.0"
author: aviz85
tags:
  - calendar
  - google
  - scheduling
  - productivity
setup: "./SETUP.md"
setup_complete: false
---

# Google Calendar Integration

> **First time?** If `setup_complete: false` above, run `./SETUP.md` first, then set `setup_complete: true`.

Read and manage Google Calendar via an Apps Script web app. It enumerates
**every calendar attached/subscribed under the deploying account**
(`CalendarApp.getAllCalendars()`) — primary, work, shared, holidays, etc. — so a
single call spans all of them, with an optional `calendarId` filter to narrow it.
Auth is a `?token=` query param (not Google login), so the `/exec` URL is
curl-able from headless/cron sessions.

## Workflow

1. **List calendars** - See every attached calendar and its id
2. **Check availability** - Query today / tomorrow / week / next-N-hours / arbitrary range
3. **Create events** - With title, time, guests, description, location, color
4. **Delete events** - Remove by event id
5. **Send invites** - `guests` auto-sends calendar invites (toggle with `sendInvites`)

## API Actions

| Action | Description | Params |
|--------|-------------|--------|
| `calendars` | List all attached calendars (id, name, isPrimary, isOwned, color) | - |
| `today` | Today's events, all calendars | `calendarId` (optional filter) |
| `tomorrow` | Tomorrow's events | `calendarId` (optional) |
| `todayTomorrow` | Today + tomorrow in one call | `calendarId` (optional) |
| `week` | This week (Sun–Sat) | `calendarId` (optional) |
| `upcoming` | Next N hours | `hours` (default 4), `calendarId` |
| `range` | Arbitrary date range | `start`, `end` (ISO); `calendarId` |
| `create` | Create an event | `title`, `start`, `end`; optional `guests`, `description`, `location`, `color`, `calendarId` (defaults to primary), `sendInvites` (default true) |
| `delete` | Delete an event | `eventId`; optional `calendarId` (defaults to primary) |

`calendarId` is a comma-separated **substring filter** matched against each
calendar's id **or** name — e.g. `calendarId=work` matches any calendar whose id
or name contains "work"; `calendarId=work,personal` matches either.

## Examples

```bash
# List every attached calendar
curl -sL "$URL?action=calendars&token=$TOKEN"

# Everything today across all calendars
curl -sL "$URL?action=today&token=$TOKEN"

# Today + tomorrow, one calendar only
curl -sL "$URL?action=todayTomorrow&calendarId=work&token=$TOKEN"

# Create a meeting with an invite
curl -sL "$URL?action=create&title=Sync&start=2026-01-15T10:00:00&end=2026-01-15T11:00:00&guests=email@example.com&token=$TOKEN"

# Create a colored block on the primary calendar, no invite
curl -sL "$URL?action=create&title=Focus&start=2026-01-15T13:00:00&end=2026-01-15T14:00:00&color=8&token=$TOKEN"

# Delete an event
curl -sL "$URL?action=delete&eventId=EVENT_ID&token=$TOKEN"
```

Always `curl -sL` — the `/exec` URL issues a redirect.

## Response Format

Each event carries `calendarId`/`calendarName` so you know its source calendar:

```json
{
  "count": 1,
  "start": "2026-01-04T00:00:00.000Z",
  "end": "2026-01-04T23:59:59.000Z",
  "events": [
    {
      "calendarId": "you@example.com",
      "calendarName": "you@example.com",
      "id": "abc123@google.com",
      "title": "Meeting Name",
      "start": "2026-01-04T09:00:00.000Z",
      "end": "2026-01-04T10:00:00.000Z",
      "location": "Zoom link or address",
      "description": null,
      "isAllDay": false,
      "guests": ["someone@example.com"],
      "color": null,
      "status": "YES"
    }
  ]
}
```

## Notes

- Timestamps in the payload are **UTC** (`...Z`). Day boundaries for
  `today`/`tomorrow`/`week` are computed in the **script timezone** — set the
  `timeZone` field in `appsscript.json` to your zone so local days line up.
  Convert the ISO timestamps to your timezone when presenting.
- `create` defaults to the primary calendar unless `calendarId` is given.
- `sendInvites` defaults to `true` when `guests` are present; pass
  `sendInvites=false` to add guests without emailing them.
- `color` accepts a Google Calendar color id ("1"–"11"); unknown values are
  ignored silently.

## Integration

Works with other skills:
- **zoom-meeting** - Check conflicts before scheduling
- **whatsapp** - Notify contacts about calendar invites
