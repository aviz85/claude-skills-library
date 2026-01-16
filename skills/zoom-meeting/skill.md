---
name: zoom-meeting
description: "Schedule Zoom meetings with calendar invites. Use when scheduling client calls, consultations, or any video meeting. Triggers: 'zoom meeting with...', 'schedule call with...', 'consultation with...'"
enhancedBy:
  - get-contact: "Auto-lookup contact by name. Without it: ask user for email/phone directly"
  - calendar: "Check conflicts and send invites. Without it: create Zoom only"
  - whatsapp: "Notify contact to check email. Without it: skip notification"
---

# Zoom Meeting Scheduler

Schedule Zoom meetings and send calendar invites automatically.

## When User Says "Zoom meeting with [name]"

Do ALL of these automatically:

1. **Find contact** using `get-contact` skill (if available)
   - If not found → ask user for email
   - If multiple found → ask user to choose
   - If one found → confirm with user before proceeding
2. **Check if meeting already exists** - search calendar for customer name. If found, ask before duplicate
3. **Check calendar** for conflicts at requested time
4. **Create Zoom meeting** → get join_url + password
5. **Create Google Calendar event** with guest + Zoom link → invite sent automatically
6. **Send WhatsApp** (optional) to contact: "שלחתי לך הזמנה לפגישה במייל, אשר בבקשה"
7. **Confirm to user** with meeting details

## Handling Multiple Contacts

If get-contact returns multiple results:
```
Found multiple contacts matching "יוסי":
1. יוסי כהן (yossi.cohen@email.com)
2. יוסי לוי (yossi.levi@email.com)

Which one should I schedule with?
```

Wait for user selection before proceeding.

## Setup

See [SETUP.md](./SETUP.md) for full setup guide (Zoom app, scopes, credentials).

**Quick:** Create `.env` in this folder:
```
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
```

## API Reference

### Get Token
```bash
source .env
TOKEN=$(curl -s -X POST "https://zoom.us/oauth/token" \
  -H "Authorization: Basic $(echo -n "${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}" | base64 | tr -d '\n')" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}" | jq -r '.access_token')
```

### Create Meeting
```bash
curl -s -X POST "https://api.zoom.us/v2/users/me/meetings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Meeting Title",
    "type": 2,
    "start_time": "2026-01-19T12:30:00",
    "duration": 60,
    "timezone": "Asia/Jerusalem"
  }'
```

### Response Fields
- `join_url` - Share with attendee
- `password` - Meeting password
- `id` - Meeting ID

## Calendar Integration

After Zoom meeting created, use calendar skill with `guests` param:
```
?action=create&title=TITLE&start=...&end=...&location=ZOOM_URL&guests=EMAIL
```

Guest receives calendar invite with Zoom link.
