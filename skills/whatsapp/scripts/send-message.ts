import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// WAHA Configuration (fallback — not currently installed)
const WAHA_URL = process.env.WAHA_URL || "http://localhost:3001";
const WAHA_API_KEY = process.env.WAHA_API_KEY;
const WAHA_SESSION = process.env.WAHA_SESSION || "default";

// Green API Configuration (fallback for media)
const GREEN_API_URL = process.env.GREEN_API_URL || "https://api.green-api.com";
// sendFileByUpload requires the media host, NOT the api host. Default to a sibling of GREEN_API_URL.
const GREEN_API_MEDIA_URL = process.env.GREEN_API_MEDIA_URL || GREEN_API_URL.replace(".api.", ".media.");
const GREEN_API_INSTANCE = process.env.GREEN_API_INSTANCE;
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN;

interface Args {
  message?: string;
  phone?: string;
  group?: string;
  image?: string;
  video?: string;
  voice?: string;
  file?: string;
  media?: string;
  quote?: string;
  dryRun: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Check if it's a flag
    if (arg.startsWith("--")) {
      switch (arg) {
        case "--phone":
        case "--to":
          result.phone = args[++i];
          break;
        case "--group":
          result.group = args[++i];
          break;
        case "--image":
          result.image = args[++i];
          break;
        case "--video":
          result.video = args[++i];
          break;
        case "--voice":
          result.voice = args[++i];
          break;
        case "--file":
          result.file = args[++i];
          break;
        case "--media":
          result.media = args[++i];
          break;
        case "--caption":
          // Caption is same as message for media
          result.message = args[++i];
          break;
        case "--quote":
          result.quote = args[++i];
          break;
        case "--dry-run":
          result.dryRun = true;
          break;
      }
    } else if (!result.message) {
      // First non-flag argument is the message
      result.message = arg;
    }
  }

  return result;
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

function formatChatId(id: string, isGroup: boolean = false): string {
  if (isGroup) {
    return id.includes("@g.us") ? id : `${id}@g.us`;
  }
  const cleanNumber = normalizePhone(id);
  return `${cleanNumber}@c.us`;
}

// ============ WAHA Functions ============

async function sendTextWaha(chatId: string, text: string): Promise<any> {
  const url = `${WAHA_URL}/api/sendText`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": WAHA_API_KEY || "",
    },
    body: JSON.stringify({
      session: WAHA_SESSION,
      chatId,
      text,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WAHA API failed: ${response.status} - ${text}`);
  }

  return response.json();
}

// ============ Green API Functions ============

async function sendTextGreenApi(chatId: string, message: string, quotedMessageId?: string): Promise<any> {
  const url = `${GREEN_API_URL}/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`;

  const body: any = { chatId, message };
  if (quotedMessageId) body.quotedMessageId = quotedMessageId;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Green API failed: ${response.status} - ${text}`);
  }

  return response.json();
}

async function sendImageGreenApi(chatId: string, filePath: string, caption?: string, quotedMessageId?: string): Promise<any> {
  const url = `${GREEN_API_URL}/waInstance${GREEN_API_INSTANCE}/sendFileByUpload/${GREEN_API_TOKEN}`;
  const fileName = path.basename(filePath);

  let curlCmd = `curl -s --location "${url}" -F 'chatId=${chatId}' -F 'file=@${filePath}' -F 'fileName=${fileName}'`;

  if (caption) {
    const escapedCaption = caption.replace(/'/g, "'\\''");
    curlCmd += ` -F 'caption=${escapedCaption}'`;
  }
  if (quotedMessageId) {
    curlCmd += ` -F 'quotedMessageId=${quotedMessageId}'`;
  }

  const { stdout, stderr } = await execAsync(curlCmd);

  if (stderr && !stdout) {
    throw new Error(`Curl error: ${stderr}`);
  }

  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Invalid response: ${stdout}`);
  }
}

async function sendVoiceGreenApi(chatId: string, filePath: string, quotedMessageId?: string): Promise<any> {
  const url = `${GREEN_API_URL}/waInstance${GREEN_API_INSTANCE}/sendFileByUpload/${GREEN_API_TOKEN}`;
  const fileName = path.basename(filePath);

  let curlCmd = `curl -s --location "${url}" -F 'chatId=${chatId}' -F 'file=@${filePath}' -F 'fileName=${fileName}'`;
  if (quotedMessageId) {
    curlCmd += ` -F 'quotedMessageId=${quotedMessageId}'`;
  }

  const { stdout, stderr } = await execAsync(curlCmd);

  if (stderr && !stdout) {
    throw new Error(`Curl error: ${stderr}`);
  }

  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Invalid response: ${stdout}`);
  }
}

async function sendFileGreenApi(chatId: string, filePath: string, caption?: string, quotedMessageId?: string): Promise<any> {
  const url = `${GREEN_API_URL}/waInstance${GREEN_API_INSTANCE}/sendFileByUpload/${GREEN_API_TOKEN}`;
  const fileName = path.basename(filePath);

  let curlCmd = `curl -s --location "${url}" -F 'chatId=${chatId}' -F 'file=@${filePath}' -F 'fileName=${fileName}'`;

  if (caption) {
    const escapedCaption = caption.replace(/'/g, "'\\''");
    curlCmd += ` -F 'caption=${escapedCaption}'`;
  }
  if (quotedMessageId) {
    curlCmd += ` -F 'quotedMessageId=${quotedMessageId}'`;
  }

  const { stdout, stderr } = await execAsync(curlCmd);

  if (stderr && !stdout) {
    throw new Error(`Curl error: ${stderr}`);
  }

  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Invalid response: ${stdout}`);
  }
}

// ============ Unified Send Functions ============

async function sendText(chatId: string, text: string, quotedMessageId?: string): Promise<{ provider: string; result: any }> {
  // Green API is the primary provider (supports quotedMessageId)
  if (GREEN_API_INSTANCE && GREEN_API_TOKEN) {
    const result = await sendTextGreenApi(chatId, text, quotedMessageId);
    return { provider: "Green API", result };
  }

  // Fallback to WAHA (only if Green API not configured and WAHA is available)
  if (WAHA_API_KEY && !quotedMessageId) {
    try {
      const result = await sendTextWaha(chatId, text);
      return { provider: "WAHA", result };
    } catch (error: any) {
      throw new Error(`WAHA failed: ${error.message} (Green API not configured)`);
    }
  }

  throw new Error("No WhatsApp provider configured!");
}

async function sendImage(chatId: string, imagePath: string, caption?: string, quotedMessageId?: string): Promise<{ provider: string; result: any }> {
  if (!GREEN_API_INSTANCE || !GREEN_API_TOKEN) {
    throw new Error("Green API credentials required for sending images (WAHA CORE doesn't support media)");
  }

  const result = await sendImageGreenApi(chatId, imagePath, caption, quotedMessageId);
  return { provider: "Green API", result };
}

async function sendVoice(chatId: string, voicePath: string, quotedMessageId?: string): Promise<{ provider: string; result: any }> {
  if (!GREEN_API_INSTANCE || !GREEN_API_TOKEN) {
    throw new Error("Green API credentials required for sending voice (WAHA CORE doesn't support media)");
  }

  const result = await sendVoiceGreenApi(chatId, voicePath, quotedMessageId);
  return { provider: "Green API", result };
}

async function sendFile(chatId: string, filePath: string, caption?: string, quotedMessageId?: string): Promise<{ provider: string; result: any }> {
  if (!GREEN_API_INSTANCE || !GREEN_API_TOKEN) {
    throw new Error("Green API credentials required for sending files (WAHA CORE doesn't support media)");
  }

  const result = await sendFileGreenApi(chatId, filePath, caption, quotedMessageId);
  return { provider: "Green API", result };
}

// ============ Main ============

async function main() {
  const args = parseArgs();

  // Show usage
  if (!args.message && !args.image && !args.video && !args.voice && !args.file && !args.media) {
    console.log("WhatsApp Message Sender (Green API primary, WAHA fallback)\n");
    console.log("Usage:");
    console.log('  npx ts-node send-message.ts "Hello!" --to 972501234567');
    console.log('  npx ts-node send-message.ts --to 972501234567 --image /path/to/img.jpg --caption "Check this!"');
    console.log('  npx ts-node send-message.ts --to 972501234567 --video /path/to/video.mp4 --caption "Watch this!"');
    console.log('  npx ts-node send-message.ts --to 972501234567 --media /path/to/any-file --caption "Here!"');
    console.log('  npx ts-node send-message.ts --to 972501234567 --voice /path/to/audio.ogg');
    console.log('  npx ts-node send-message.ts --to 972501234567 --file /path/to/doc.pdf --caption "Document"');
    console.log('  npx ts-node send-message.ts "Group msg" --group 120363xxx@g.us');
    console.log("");
    console.log("Options:");
    console.log("  --to, --phone <NUMBER>   Phone number (Israeli format accepted)");
    console.log("  --group <ID>             Group ID (format: 120363xxx@g.us)");
    console.log("  --image <PATH>           Attach image file");
    console.log("  --video <PATH>           Attach video file");
    console.log("  --media <PATH>           Attach any media file (auto-detect type)");
    console.log("  --voice <PATH>           Send voice message (OGG/MP3)");
    console.log("  --file <PATH>            Attach document/file");
    console.log("  --caption <TEXT>         Caption for media (or use positional arg)");
    console.log("  --quote <MSG_ID>         Reply to a specific message (quotedMessageId)");
    console.log("  --dry-run                Preview without sending");
    console.log("");
    console.log("Providers:");
    console.log("  - Text: Green API (primary) -> WAHA (fallback)");
    console.log("  - Media: Green API only");
    process.exit(1);
  }

  if (!args.phone && !args.group) {
    console.error("Error: --phone or --group is required");
    process.exit(1);
  }

  // Validate media files exist
  const mediaFile = args.image || args.video || args.voice || args.file || args.media;
  if (mediaFile && !fs.existsSync(mediaFile)) {
    console.error(`Error: File not found: ${mediaFile}`);
    process.exit(1);
  }

  // Normalize literal \n sequences to real newlines (common when shell
  // quoting breaks $'...' context, e.g. around apostrophes)
  if (args.message) {
    args.message = args.message.replace(/\\n/g, "\n");
  }

  const chatId = args.group
    ? formatChatId(args.group, true)
    : formatChatId(args.phone!, false);

  // Determine media type (video and media are treated as files)
  const hasMedia = args.image || args.video || args.voice || args.file || args.media;
  const mediaType = args.image ? "image" : args.video ? "video" : args.voice ? "voice" : (args.file || args.media) ? "file" : null;

  console.log(`Target: ${chatId}`);
  if (args.message) console.log(`Message: ${args.message}`);
  if (args.quote) console.log(`Quote: ${args.quote}`);
  if (mediaFile) {
    const fileSize = fs.statSync(mediaFile).size;
    console.log(`${mediaType}: ${path.basename(mediaFile)} (${(fileSize / 1024).toFixed(1)} KB)`);
  }
  console.log("");

  if (args.dryRun) {
    console.log("✓ [DRY RUN] Would send message");
    return;
  }

  try {
    let result: { provider: string; result: any };

    if (args.image) {
      result = await sendImage(chatId, args.image, args.message, args.quote);
      console.log(`✓ Image sent via ${result.provider}!`);
    } else if (args.video) {
      result = await sendFile(chatId, args.video, args.message, args.quote);
      console.log(`✓ Video sent via ${result.provider}!`);
    } else if (args.media) {
      result = await sendFile(chatId, args.media, args.message, args.quote);
      console.log(`✓ Media sent via ${result.provider}!`);
    } else if (args.voice) {
      result = await sendVoice(chatId, args.voice, args.quote);
      console.log(`✓ Voice sent via ${result.provider}!`);
    } else if (args.file) {
      result = await sendFile(chatId, args.file, args.message, args.quote);
      console.log(`✓ File sent via ${result.provider}!`);
    } else if (args.message) {
      result = await sendText(chatId, args.message, args.quote);
      console.log(`✓ Message sent via ${result.provider}!`);
    }

    if (result!.result.idMessage) {
      console.log(`  ID: ${result!.result.idMessage}`);
    }
    if (result!.result.urlFile) {
      console.log(`  URL: ${result!.result.urlFile}`);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
