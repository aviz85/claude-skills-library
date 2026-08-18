---
name: gmail
description: "Gmail automation via Google Apps Script. Use for: send emails, read inbox, create/edit/delete drafts, search messages."
version: "1.1.0"
author: aviz85
tags:
  - gmail
  - email
  - google
  - automation
setup: "./SETUP.md"
setup_complete: false
---

# Gmail Integration

> **First time?** If `setup_complete: false` above, run `./SETUP.md` first, then set `setup_complete: true`.

Full Gmail automation via Google Apps Script API: send, read inbox, full draft lifecycle (create/list/edit/delete), reply in-thread, mark as read.

## Workflow

1. **Read inbox** - Get unread emails with optional filters
2. **Send email** - Send with HTML support, CC/BCC; reply in-thread via `replyTo`
3. **Manage drafts** - Create, list, edit, and delete drafts
4. **Mark as read** - Update email status

## API Actions

| Action | Description | Required Params | Optional |
|--------|-------------|-----------------|----------|
| `send` | Send email (or in-thread reply) | `to` *(or `replyTo`)* | `subject`, `body`, `html`, `cc`, `bcc`, `name`, `replyTo` |
| `inbox` | Read inbox / search | - | `maxResults`, `query`, `hours` |
| `draft` | Create draft | `to`, `subject`, `body` | `html`, `replyTo` |
| `drafts` | List drafts | - | `maxResults` |
| `editDraft` | Edit an existing draft | `draftId` | `to`, `subject`, `body`, `html`, `cc`, `bcc` |
| `deleteDraft` | Delete a draft | `draftId` | - |
| `markRead` | Mark as read | `messageId` | - |

## Examples

```bash
# Send email
curl -sL "$URL?token=$TOKEN&action=send&to=user@example.com&subject=Hello&body=Message"

# Reply in-thread (no orphan draft) — replyTo is a messageId
curl -sL "$URL?token=$TOKEN&action=send&replyTo=MESSAGE_ID&body=Thanks!"

# Get last 10 unread emails from last 6 hours
curl -sL "$URL?token=$TOKEN&action=inbox&maxResults=10&hours=6"

# Search for specific emails (custom query honored verbatim — no implicit filters)
curl -sL "$URL?token=$TOKEN&action=inbox&query=from:important@client.com"

# Create draft
curl -sL "$URL?token=$TOKEN&action=draft&to=user@example.com&subject=Follow%20Up&body=Draft"

# List drafts (to find a draftId)
curl -sL "$URL?token=$TOKEN&action=drafts&maxResults=10"

# Edit a draft (change only what you pass; rest is preserved)
curl -sL "$URL?token=$TOKEN&action=editDraft&draftId=DRAFT_ID&body=Revised%20text"

# Delete a draft
curl -sL "$URL?token=$TOKEN&action=deleteDraft&draftId=DRAFT_ID"

# Mark email as read
curl -sL "$URL?token=$TOKEN&action=markRead&messageId=MESSAGE_ID"
```

## Response Format

**Send:**
```json
{
  "success": true,
  "email": { "to": "user@example.com", "subject": "Hello", "cc": null, "bcc": null }
}
```

**Inbox:**
```json
{
  "success": true,
  "count": 5,
  "query": "is:unread after:2026/01/14",
  "emails": [
    {
      "id": "message_id",
      "threadId": "thread_id",
      "from": "sender@example.com",
      "to": "you@example.com",
      "subject": "Email Subject",
      "date": "2026-01-14T08:30:00Z",
      "snippet": "First 200 chars...",
      "body": "Full email body",
      "isUnread": true,
      "labels": ["INBOX", "UNREAD"]
    }
  ]
}
```

**Drafts / editDraft:**
```json
{ "success": true, "draft": { "id": "r-123", "to": "user@example.com", "subject": "Follow Up" } }
```

## Managing drafts

- **List** with `action=drafts` to discover a `draftId` (returns id/to/subject/date/snippet), or reuse the `id` returned by `action=draft`.
- **Edit** with `action=editDraft`. Under the hood this is `GmailDraft.update()`, which **replaces the whole draft** — so any field you don't pass is re-filled from the draft's current contents. You can change just the body (or just the subject) and the rest stays put; the `draftId` is stable (edited in place, not cloned). Pass `html=...` to set an HTML body.
- **Delete** with `action=deleteDraft`. GmailApp has no native draft-delete, so this uses the **advanced Gmail service** (`Gmail.Users.Drafts.remove`), which is declared in `appsscript.json` under `dependencies.enabledAdvancedServices`. That block must be present or the call throws `Gmail is not defined`. No extra OAuth scope is needed (the full mail scope `send`/`draft` already require covers it), but because the manifest declares an advanced service, the **first deploy after adding it may prompt a re-authorization** — approve it.

## Replying without leaving orphan drafts

To answer an existing email, use `action=send` with `replyTo=<messageId>`. This sends directly via the script (in-thread, inherits the subject) and creates **no draft**. Pass `cc` to keep others looped in.

Avoid creating a draft and then hitting Send in the Gmail web UI. A draft made through any API (this skill or a connector) is not bound to the web client's send action, so sending from the UI dispatches a copy and leaves the original draft orphaned in Drafts. Sending server-side (here) avoids that entirely.

To verify a send, query Sent directly: `action=inbox&query=in:sent to:<addr>`. A custom `query` is honored verbatim (no implicit date filter), and messages return newest-first within each thread, so a small `maxResults` still surfaces the latest reply.

## Important Notes

- **No emojis** in subject/body - URL encoding breaks them
- Default inbox query (when no `query` given): `is:unread` with a time filter; `hours` defaults to 24
- A custom `query` is honored verbatim — no implicit filters are added, so you can reliably search sent mail, archived threads, etc.
- Messages return newest-first within each thread

## Maintenance: redeploy after editing Code.js

The live endpoint is a versioned Web App deployment. After editing `Code.js` or `appsscript.json`:

```bash
cd scripts
clasp push --force
clasp deploy --description "what changed"   # creates a new deployment + URL
```

Then point your `GMAIL_API_URL` at the new `/macros/s/.../exec` URL.

Gotchas learned the hard way:
- **clasp 3.x** uses the `{tokens:{default}}` auth format in `~/.clasprc.json`; clasp 2.x throws "Cannot read properties of undefined (reading 'access_token')".
- **`appsscript.json` must include the `webapp` block** (`executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS`). Without it the deployment is login-gated and anonymous requests get a Google "file not found" page instead of JSON. The token is the real auth gate.
- A fresh `clasp deploy` is more reliable than an in-place `deploy -i <id>` (the latter has returned the 404 page in practice). Cost is a new URL each time.

## Integration

Works with other skills:
- **whatsapp** - Forward important emails as messages
- **calendar** - Create events from email content
