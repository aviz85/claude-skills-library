import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const API_URL = process.env.GREEN_API_URL || "https://api.green-api.com";
const INSTANCE_ID = process.env.GREEN_API_INSTANCE;
const API_TOKEN = process.env.GREEN_API_TOKEN;

interface SendMessageResponse {
  idMessage: string;
}

interface Participant {
  id: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

interface GroupData {
  groupId: string;
  participants: Participant[];
  subject: string;
}

interface Args {
  groupId?: string;
  phone?: string;
  message?: string;
  dmAll: boolean;
  dryRun: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    dmAll: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--group":
        result.groupId = args[++i];
        break;
      case "--phone":
        result.phone = args[++i];
        break;
      case "--message":
        result.message = args[++i];
        break;
      case "--dm-all":
        result.dmAll = true;
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
    }
  }

  return result;
}

function normalizePhone(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(/\D/g, "");

  // Handle Israeli numbers
  if (digits.startsWith("972")) {
    // Already correct
  } else if (digits.startsWith("0")) {
    digits = "972" + digits.substring(1);
  } else if (digits.length === 9) {
    digits = "972" + digits;
  }

  return digits;
}

function formatChatId(id: string, isGroup: boolean): string {
  if (isGroup) {
    return id.includes("@g.us") ? id : `${id}@g.us`;
  }
  const cleanNumber = normalizePhone(id);
  return `${cleanNumber}@c.us`;
}

async function sendMessage(chatId: string, message: string): Promise<SendMessageResponse> {
  const url = `${API_URL}/waInstance${INSTANCE_ID}/sendMessage/${API_TOKEN}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chatId, message }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} - ${text}`);
  }

  return response.json();
}

async function getGroupData(groupId: string): Promise<GroupData> {
  const url = `${API_URL}/waInstance${INSTANCE_ID}/getGroupData/${API_TOKEN}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ groupId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} - ${text}`);
  }

  return response.json();
}

async function main() {
  // Validate credentials
  if (!INSTANCE_ID || !API_TOKEN) {
    console.error("Error: Missing credentials!");
    console.error("Please configure GREEN_API_INSTANCE and GREEN_API_TOKEN in .env file");
    console.error("");
    console.error("Create .env file with:");
    console.error("  GREEN_API_URL=https://7103.api.greenapi.com");
    console.error("  GREEN_API_INSTANCE=your_instance_id");
    console.error("  GREEN_API_TOKEN=your_api_token");
    process.exit(1);
  }

  const args = parseArgs();

  // Validate arguments
  if (!args.message) {
    console.error("Usage:");
    console.error('  npx ts-node send-message.ts --phone "972501234567" --message "Hello!"');
    console.error('  npx ts-node send-message.ts --group "GROUP_ID" --message "Hello group!"');
    console.error('  npx ts-node send-message.ts --group "GROUP_ID" --dm-all --message "Personal msg"');
    console.error("");
    console.error("Options:");
    console.error("  --phone <NUMBER>  Phone number (international format, no +)");
    console.error("  --group <ID>      Group ID (format: 120363xxx@g.us)");
    console.error("  --message <TEXT>  Message text to send");
    console.error("  --dm-all          Send DM to each group participant");
    console.error("  --dry-run         Preview without sending");
    process.exit(1);
  }

  if (!args.groupId && !args.phone) {
    console.error("Error: Either --group or --phone is required");
    process.exit(1);
  }

  try {
    if (args.dryRun) {
      console.log("=== DRY RUN MODE - No messages will be sent ===\n");
    }

    // Send to individual phone
    if (args.phone && !args.groupId) {
      const chatId = formatChatId(args.phone, false);
      console.log(`Sending to: ${chatId}`);
      console.log(`Message: ${args.message}\n`);

      if (!args.dryRun) {
        const result = await sendMessage(chatId, args.message);
        console.log(`✓ Message sent! ID: ${result.idMessage}`);
      } else {
        console.log("✓ [DRY RUN] Would send message");
      }
      return;
    }

    // Send to group
    if (args.groupId && !args.dmAll) {
      const chatId = formatChatId(args.groupId, true);
      console.log(`Sending to group: ${chatId}`);
      console.log(`Message: ${args.message}\n`);

      if (!args.dryRun) {
        const result = await sendMessage(chatId, args.message);
        console.log(`✓ Message sent to group! ID: ${result.idMessage}`);
      } else {
        console.log("✓ [DRY RUN] Would send message to group");
      }
      return;
    }

    // DM all participants
    if (args.groupId && args.dmAll) {
      const groupId = formatChatId(args.groupId, true);
      console.log(`Fetching participants from group: ${groupId}\n`);

      const groupData = await getGroupData(groupId);
      console.log(`Group: ${groupData.subject}`);
      console.log(`Found ${groupData.participants.length} participants\n`);
      console.log(`Message to send: ${args.message}\n`);

      let successCount = 0;
      let failCount = 0;

      for (const participant of groupData.participants) {
        // Convert group participant ID to chat ID
        const chatId = participant.id.replace("@g.us", "").replace("@s.whatsapp.net", "") + "@c.us";

        if (args.dryRun) {
          console.log(`[DRY RUN] Would send to: ${chatId}`);
          successCount++;
        } else {
          try {
            const result = await sendMessage(chatId, args.message);
            console.log(`✓ Sent to ${chatId} (ID: ${result.idMessage})`);
            successCount++;

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`✗ Failed to send to ${chatId}:`, error);
            failCount++;
          }
        }
      }

      console.log(`\n=== Summary ===`);
      console.log(`Successful: ${successCount}`);
      console.log(`Failed: ${failCount}`);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
