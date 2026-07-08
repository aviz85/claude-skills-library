import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const API_URL = process.env.GREEN_API_URL || "https://api.green-api.com";
const INSTANCE_ID = process.env.GREEN_API_INSTANCE;
const API_TOKEN = process.env.GREEN_API_TOKEN;

interface IncomingMessage {
  type: string;
  idMessage: string;
  timestamp: number;
  typeMessage: string;
  chatId: string;
  senderId?: string;
  senderName?: string;
  textMessage?: string;
  caption?: string;
  fileName?: string;
  downloadUrl?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
}

interface ChatHistoryMessage {
  type: string;
  idMessage: string;
  timestamp: number;
  typeMessage: string;
  chatId: string;
  statusMessage?: string;
  sendByApi?: boolean;
  senderName?: string;
  textMessage?: string;
  extendedTextMessage?: { text?: string; description?: string; title?: string };
  quotedMessage?: {
    textMessage?: string;
    extendedTextMessage?: { text?: string };
    senderName?: string;
    participant?: string;
  };
  caption?: string;
  fileName?: string;
  downloadUrl?: string;
}

interface Args {
  chat?: string;
  minutes?: number;
  start?: string;
  end?: string;
  count?: number;
  json: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--chat":
        result.chat = args[++i];
        break;
      case "--minutes":
        result.minutes = parseInt(args[++i], 10);
        break;
      case "--start":
        result.start = args[++i];
        break;
      case "--end":
        result.end = args[++i];
        break;
      case "--count":
        result.count = parseInt(args[++i], 10);
        break;
      case "--json":
        result.json = true;
        break;
      case "-h":
      case "--help":
        printUsage();
        process.exit(0);
    }
  }

  return result;
}

function printUsage(): void {
  console.log(`
Usage: npx ts-node get-messages.ts [OPTIONS]

Get incoming messages journal or chat history from WhatsApp.

OPTIONS:
  --chat <ID>       Get history for specific chat (phone number or group ID)
                    Examples: 972501234567, 120363xxx@g.us
  --minutes <N>     Get messages from the last N minutes (default: 1440 = 24h)
  --start <TIME>    Start time (ISO format or relative like "2h ago", "yesterday")
  --end <TIME>      End time (ISO format or relative, default: now)
  --count <N>       Number of messages to retrieve (default: 100, for --chat only)
  --json            Output raw JSON format
  -h, --help        Show this help

EXAMPLES:
  # Get all incoming messages from last 24 hours
  npx ts-node get-messages.ts

  # Get incoming messages from last 2 hours
  npx ts-node get-messages.ts --minutes 120

  # Get incoming messages from last 2 hours (alternative)
  npx ts-node get-messages.ts --start "2h ago"

  # Get chat history for a specific number
  npx ts-node get-messages.ts --chat 972501234567

  # Get chat history for a group
  npx ts-node get-messages.ts --chat "120363044291817037@g.us" --count 50

  # Get messages between specific times
  npx ts-node get-messages.ts --start "2025-01-10T10:00:00" --end "2025-01-10T18:00:00"

  # Output as JSON
  npx ts-node get-messages.ts --json
`);
}

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) {
    // Already correct
  } else if (digits.startsWith("0")) {
    digits = "972" + digits.substring(1);
  } else if (digits.length === 9) {
    digits = "972" + digits;
  }
  return digits;
}

function formatChatId(id: string): string {
  if (id.includes("@g.us") || id.includes("@c.us")) {
    return id;
  }
  // Check if it looks like a group ID (starts with 120363)
  if (id.startsWith("120363")) {
    return `${id}@g.us`;
  }
  // Assume it's a phone number
  return `${normalizePhone(id)}@c.us`;
}

function parseRelativeTime(timeStr: string): Date {
  const now = new Date();

  // Check for relative time patterns
  const relativeMatch = timeStr.match(/^(\d+)\s*(m|min|minutes?|h|hours?|d|days?)\s*ago$/i);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();

    if (unit.startsWith("m")) {
      return new Date(now.getTime() - value * 60 * 1000);
    } else if (unit.startsWith("h")) {
      return new Date(now.getTime() - value * 60 * 60 * 1000);
    } else if (unit.startsWith("d")) {
      return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
    }
  }

  // Check for "yesterday"
  if (timeStr.toLowerCase() === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }

  // Check for "today"
  if (timeStr.toLowerCase() === "today") {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return today;
  }

  // Try to parse as ISO date
  const parsed = new Date(timeStr);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  return parsed;
}

function calculateMinutes(start?: string, end?: string): number {
  const now = new Date();
  const endTime = end ? parseRelativeTime(end) : now;
  const startTime = start ? parseRelativeTime(start) : new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const diffMs = endTime.getTime() - startTime.getTime();
  return Math.ceil(diffMs / (60 * 1000));
}

async function getLastIncomingMessages(minutes: number = 1440): Promise<IncomingMessage[]> {
  const url = `${API_URL}/waInstance${INSTANCE_ID}/lastIncomingMessages/${API_TOKEN}?minutes=${minutes}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} - ${text}`);
  }

  return response.json();
}

async function getChatHistory(chatId: string, count: number = 100): Promise<ChatHistoryMessage[]> {
  const url = `${API_URL}/waInstance${INSTANCE_ID}/getChatHistory/${API_TOKEN}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chatId, count }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} - ${text}`);
  }

  return response.json();
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMessage(msg: IncomingMessage | ChatHistoryMessage): string {
  const time = formatTimestamp(msg.timestamp);
  const direction = msg.type === "incoming" ? "<<<" : ">>>";
  const sender = "senderId" in msg && msg.senderId ? msg.senderId.replace("@c.us", "") : "";
  const senderName = "senderName" in msg && msg.senderName ? msg.senderName : "";

  let content = "";
  switch (msg.typeMessage) {
    case "textMessage":
      content = msg.textMessage || "";
      break;
    case "extendedTextMessage": {
      const ext = (msg as ChatHistoryMessage).extendedTextMessage;
      content = ext?.text || msg.textMessage || "";
      break;
    }
    case "quotedMessage": {
      // Message that quotes/replies to another message
      const ext = (msg as ChatHistoryMessage).extendedTextMessage;
      content = ext?.text || msg.textMessage || "";
      break;
    }
    case "imageMessage":
    case "videoMessage":
    case "documentMessage":
    case "audioMessage":
      content = `[${msg.typeMessage}] ${msg.caption || msg.fileName || ""}`;
      break;
    case "stickerMessage":
      content = "[Sticker]";
      break;
    case "locationMessage":
      content = "[Location]";
      break;
    case "contactMessage":
      content = "[Contact]";
      break;
    case "reactionMessage":
      content = "[Reaction]";
      break;
    default:
      content = `[${msg.typeMessage}]`;
  }

  // Append quoted message context if present
  const quoted = (msg as ChatHistoryMessage).quotedMessage;
  if (quoted) {
    const quotedText = quoted.textMessage || quoted.extendedTextMessage?.text || "";
    if (quotedText) {
      const truncated = quotedText.length > 150 ? quotedText.substring(0, 150) + "..." : quotedText;
      const quotedSender = quoted.senderName || quoted.participant?.replace("@c.us", "") || "";
      const prefix = quotedSender ? `${quotedSender}: ` : "";
      content += `\n  ↳ Reply to ${prefix}${truncated}`;
    }
  }

  const chatInfo = msg.chatId.includes("@g.us") ? `[Group: ${msg.chatId}]` : "";
  const senderInfo = sender ? `[From: ${sender}]` : "";
  const nameInfo = senderName ? ` (${senderName})` : "";

  return `${time} ${direction} ${chatInfo}${senderInfo}${nameInfo} ${content}`;
}

function filterMessagesByTimeRange(
  messages: IncomingMessage[],
  start?: string,
  end?: string
): IncomingMessage[] {
  if (!start && !end) return messages;

  const now = new Date();
  const startTime = start ? parseRelativeTime(start) : new Date(0);
  const endTime = end ? parseRelativeTime(end) : now;

  return messages.filter((msg) => {
    const msgTime = new Date(msg.timestamp * 1000);
    return msgTime >= startTime && msgTime <= endTime;
  });
}

async function main() {
  if (!INSTANCE_ID || !API_TOKEN) {
    console.error("Error: Missing credentials!");
    console.error("Please configure GREEN_API_INSTANCE and GREEN_API_TOKEN in .env file");
    process.exit(1);
  }

  const args = parseArgs();

  try {
    if (args.chat) {
      // Get history for specific chat
      const chatId = formatChatId(args.chat);
      const count = args.count || 100;

      console.error(`Fetching chat history for: ${chatId}`);
      console.error(`Count: ${count}\n`);

      const messages = await getChatHistory(chatId, count);

      if (args.json) {
        console.log(JSON.stringify(messages, null, 2));
      } else {
        console.log(`=== Chat History (${messages.length} messages) ===\n`);
        // Messages come in descending order, reverse for chronological
        for (const msg of messages.reverse()) {
          console.log(formatMessage(msg));
        }
      }
    } else {
      // Get incoming messages journal
      let minutes = args.minutes || 1440;

      // Calculate minutes from start/end if provided
      if (args.start || args.end) {
        minutes = calculateMinutes(args.start, args.end);
      }

      console.error(`Fetching incoming messages from last ${minutes} minutes...\n`);

      let messages = await getLastIncomingMessages(minutes);

      // Apply additional time filtering if start/end provided
      if (args.start || args.end) {
        messages = filterMessagesByTimeRange(messages, args.start, args.end);
      }

      if (args.json) {
        console.log(JSON.stringify(messages, null, 2));
      } else {
        console.log(`=== Incoming Messages (${messages.length} messages) ===\n`);
        // Sort by timestamp ascending for chronological order
        messages.sort((a, b) => a.timestamp - b.timestamp);
        for (const msg of messages) {
          console.log(formatMessage(msg));
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
