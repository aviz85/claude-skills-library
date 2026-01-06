import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const API_URL = process.env.GREEN_API_URL || "https://api.green-api.com";
const INSTANCE_ID = process.env.GREEN_API_INSTANCE;
const API_TOKEN = process.env.GREEN_API_TOKEN;

interface Participant {
  id: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

interface GroupData {
  groupId: string;
  owner: string;
  subject: string;
  creation: number;
  participants: Participant[];
  size: number;
  groupInviteLink?: string;
}

interface Args {
  groupId: string;
  phonesOnly: boolean;
  json: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    groupId: "",
    phonesOnly: false,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--phones-only") {
      result.phonesOnly = true;
    } else if (args[i] === "--json") {
      result.json = true;
    } else if (!args[i].startsWith("--")) {
      result.groupId = args[i];
    }
  }

  return result;
}

function normalizePhone(whatsappId: string): string {
  // Remove @c.us or @s.whatsapp.net suffix
  return whatsappId.replace(/@.*$/, "");
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

  if (!args.groupId) {
    console.error("Usage: npx ts-node get-group-members.ts <GROUP_ID> [options]");
    console.error("");
    console.error("Options:");
    console.error("  --phones-only  Output only phone numbers (one per line)");
    console.error("  --json         Output full JSON data");
    console.error("");
    console.error("Examples:");
    console.error("  npx ts-node get-group-members.ts 120363044291817037@g.us");
    console.error("  npx ts-node get-group-members.ts 120363044291817037@g.us --phones-only");
    console.error("  npx ts-node get-group-members.ts 120363044291817037@g.us --phones-only > phones.txt");
    process.exit(1);
  }

  // Ensure group ID has correct format
  const groupId = args.groupId.includes("@g.us") ? args.groupId : `${args.groupId}@g.us`;

  try {
    const groupData = await getGroupData(groupId);

    // Extract phone numbers
    const phones = groupData.participants.map((p) => normalizePhone(p.id));

    if (args.phonesOnly) {
      // Output just phone numbers, one per line
      phones.forEach((phone) => console.log(phone));
    } else if (args.json) {
      // Full JSON output
      console.log(JSON.stringify({
        groupId: groupData.groupId,
        subject: groupData.subject,
        size: groupData.size,
        owner: normalizePhone(groupData.owner),
        participants: groupData.participants.map((p) => ({
          phone: normalizePhone(p.id),
          isAdmin: p.isAdmin,
          isSuperAdmin: p.isSuperAdmin,
        })),
      }, null, 2));
    } else {
      // Human-readable output
      console.log(`\n=== ${groupData.subject} ===\n`);
      console.log(`Group ID: ${groupData.groupId}`);
      console.log(`Size: ${groupData.size} members`);
      console.log(`Owner: ${normalizePhone(groupData.owner)}`);
      console.log("");

      const admins = groupData.participants.filter((p) => p.isAdmin || p.isSuperAdmin);
      const members = groupData.participants.filter((p) => !p.isAdmin && !p.isSuperAdmin);

      console.log(`Admins (${admins.length}):`);
      admins.forEach((p) => {
        const role = p.isSuperAdmin ? "Owner" : "Admin";
        console.log(`  ${normalizePhone(p.id)} [${role}]`);
      });

      console.log(`\nMembers (${members.length}):`);
      members.forEach((p) => {
        console.log(`  ${normalizePhone(p.id)}`);
      });

      console.log(`\n=== All Phone Numbers ===\n`);
      phones.forEach((phone) => console.log(phone));
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
