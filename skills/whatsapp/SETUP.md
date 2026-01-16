# WhatsApp Skill - Setup Guide

## Prerequisites

- Green API account
- WhatsApp phone connected

## 1. Create Green API Account

1. Go to [green-api.com](https://green-api.com)
2. Sign up for free account
3. Create a new instance

## 2. Authorize Instance

1. Open the instance in console
2. Scan QR code with WhatsApp
3. Wait for "authorized" status

## 3. Get Credentials

From [console.green-api.com](https://console.green-api.com/):

| Field | Where |
|-------|-------|
| Instance ID | Instance settings |
| API Token | Instance settings |
| API URL | Usually `https://7103.api.greenapi.com` |

## 4. Configure

Create `.env` in `scripts/` folder:

```bash
GREEN_API_URL=https://7103.api.greenapi.com
GREEN_API_INSTANCE=your_instance_id
GREEN_API_TOKEN=your_api_token
```

## 5. Install Dependencies

```bash
cd scripts/
npm install
```

## 6. Test

```bash
# Send test message to yourself
npx ts-node send-message.ts --phone "YOUR_PHONE" --message "Test from Claude!" --dry-run

# If dry-run looks good, remove --dry-run flag
npx ts-node send-message.ts --phone "YOUR_PHONE" --message "Test from Claude!"
```

## Voice Notes (Optional)

For voice messages, install ffmpeg:

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 error | Check API token |
| Phone not authorized | Rescan QR code |
| Voice fails | Install ffmpeg |
| Rate limited | Wait a few minutes |

## Finding Group IDs

Group IDs look like: `120363123456789012@g.us`

Ways to find:
1. WhatsApp Web URL contains group ID
2. Use Green API console "Groups" section
3. Ask Claude to list your groups via API
