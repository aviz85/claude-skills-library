# Zoom Meeting Skill - Setup Guide

## 1. Create Zoom App

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/develop/create)
2. Click **Develop** → **Build App**
3. Choose **Server-to-Server OAuth** (not regular OAuth)
4. Give it a name (e.g., "Claude Meetings")

## 2. Get Credentials

After creating the app, copy these from **App Credentials**:

| Field | Where to find |
|-------|---------------|
| Account ID | App Credentials tab |
| Client ID | App Credentials tab |
| Client Secret | App Credentials tab (click to reveal) |

## 3. Add Scopes

Go to **Scopes** tab → **Add Scopes** → search and add:

| Scope | Purpose |
|-------|---------|
| `meeting:write:meeting:admin` | Create meetings |

Optional (for future features):
- `meeting:read:meeting:admin` - Read meeting details
- `meeting:delete:meeting:admin` - Delete meetings

## 4. Activate App

**Important:** Click **Activate** button. App won't work in draft mode.

## 5. Create .env File

Create `.env` in the skill folder:

```bash
# /path/to/skills/zoom-meeting/.env
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here
```

## 6. Add to .gitignore

Make sure `.env` is ignored:

```bash
echo ".env" >> .gitignore
```

## 7. Test It

```bash
source .env

# Get token
TOKEN=$(curl -s -X POST "https://zoom.us/oauth/token" \
  -H "Authorization: Basic $(echo -n "${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}" | base64 | tr -d '\n')" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}" | jq -r '.access_token')

echo "Token: ${TOKEN:0:20}..."

# Create test meeting
curl -s -X POST "https://api.zoom.us/v2/users/me/meetings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Test Meeting", "type": 2, "duration": 30}'
```

If you see a meeting response with `join_url`, you're good!

## Troubleshooting

| Error | Solution |
|-------|----------|
| `invalid_client` | App not activated, or wrong credentials |
| `Invalid access token, does not contain scopes` | Add the missing scope, reactivate app |
| Empty response | Check if `jq` is installed |

## Notes

- Tokens expire after 1 hour (auto-refresh in skill)
- Server-to-Server OAuth = no user login needed
- Free Zoom accounts work fine
