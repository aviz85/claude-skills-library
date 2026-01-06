import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const API_URL = process.env.GREEN_API_URL || "https://api.green-api.com";
const INSTANCE_ID = process.env.GREEN_API_INSTANCE;
const API_TOKEN = process.env.GREEN_API_TOKEN;

interface Args {
  phone?: string;
  group?: string;
  audioPath?: string;
  dryRun: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--phone":
        result.phone = args[++i];
        break;
      case "--group":
        result.group = args[++i];
        break;
      case "--audio":
        result.audioPath = args[++i];
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
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

function formatChatId(id: string): string {
  const cleanNumber = normalizePhone(id);
  return `${cleanNumber}@c.us`;
}

async function convertToOgg(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.[^.]+$/, ".ogg");

  // Convert to OGG with opus codec for WhatsApp voice notes
  // Settings: mono, 48kHz sample rate, 32k bitrate (WhatsApp requirements)
  const cmd = `ffmpeg -y -i "${inputPath}" -ac 1 -ar 48000 -b:a 32k -c:a libopus "${outputPath}"`;

  console.log("Converting to OGG (opus) for WhatsApp voice note...");

  try {
    await execAsync(cmd);
    return outputPath;
  } catch (error: any) {
    throw new Error(`FFmpeg conversion failed: ${error.message}`);
  }
}

async function sendFileByUpload(
  chatId: string,
  filePath: string
): Promise<{ idMessage: string; urlFile: string }> {
  const url = `${API_URL}/waInstance${INSTANCE_ID}/sendFileByUpload/${API_TOKEN}`;
  const fileName = path.basename(filePath);

  // Build curl command for multipart form data
  const curlCmd = `curl -s --location "${url}" -F 'chatId=${chatId}' -F 'file=@${filePath}' -F 'fileName=${fileName}'`;

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

async function main() {
  if (!INSTANCE_ID || !API_TOKEN) {
    console.error("Error: Missing credentials!");
    console.error("Please configure GREEN_API_INSTANCE and GREEN_API_TOKEN in .env file");
    process.exit(1);
  }

  const args = parseArgs();

  if ((!args.phone && !args.group) || !args.audioPath) {
    console.error("Usage:");
    console.error('  npx ts-node send-voice.ts --phone "972501234567" --audio "/path/to/audio.mp3"');
    console.error('  npx ts-node send-voice.ts --group "120363xxx@g.us" --audio "/path/to/audio.mp3"');
    console.error("");
    console.error("Options:");
    console.error("  --phone <NUMBER>   Phone number (international format, no +)");
    console.error("  --group <ID>       Group ID (format: 120363xxx@g.us)");
    console.error("  --audio <PATH>     Path to audio file (will be converted to OGG)");
    console.error("  --dry-run          Preview without sending");
    process.exit(1);
  }

  // Check if file exists
  if (!fs.existsSync(args.audioPath)) {
    console.error(`Error: File not found: ${args.audioPath}`);
    process.exit(1);
  }

  try {
    // Use group ID directly if provided, otherwise format phone
    const chatId = args.group ? args.group : formatChatId(args.phone!);
    const fileSize = fs.statSync(args.audioPath).size;

    console.log(`\n=== Send Voice Message ===`);
    console.log(`To: ${chatId}`);
    console.log(`File: ${path.basename(args.audioPath)} (${(fileSize / 1024).toFixed(1)} KB)`);
    console.log("");

    if (args.dryRun) {
      console.log("✓ [DRY RUN] Would convert and send voice message");
      return;
    }

    // Convert to OGG if not already
    let oggPath = args.audioPath;
    if (!args.audioPath.toLowerCase().endsWith(".ogg")) {
      oggPath = await convertToOgg(args.audioPath);
      console.log(`Converted: ${path.basename(oggPath)}`);
    }

    // Send as voice note
    const result = await sendFileByUpload(chatId, oggPath);
    console.log(`✓ Voice message sent! ID: ${result.idMessage}`);

    // Clean up converted file if we created it
    if (oggPath !== args.audioPath && fs.existsSync(oggPath)) {
      fs.unlinkSync(oggPath);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
