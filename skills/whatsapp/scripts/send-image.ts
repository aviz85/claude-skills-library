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
  imagePath?: string;
  caption?: string;
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
      case "--image":
        result.imagePath = args[++i];
        break;
      case "--caption":
        result.caption = args[++i];
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

async function sendFileByUpload(
  chatId: string,
  filePath: string,
  caption?: string
): Promise<{ idMessage: string; urlFile: string }> {
  const url = `${API_URL}/waInstance${INSTANCE_ID}/sendFileByUpload/${API_TOKEN}`;
  const fileName = path.basename(filePath);

  // Build curl command - more reliable for multipart form data
  let curlCmd = `curl -s --location "${url}" -F 'chatId=${chatId}' -F 'file=@${filePath}' -F 'fileName=${fileName}'`;

  if (caption) {
    // Escape single quotes in caption
    const escapedCaption = caption.replace(/'/g, "'\\''");
    curlCmd += ` -F 'caption=${escapedCaption}'`;
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

async function main() {
  if (!INSTANCE_ID || !API_TOKEN) {
    console.error("Error: Missing credentials!");
    console.error("Please configure GREEN_API_INSTANCE and GREEN_API_TOKEN in .env file");
    process.exit(1);
  }

  const args = parseArgs();

  if (!args.phone || !args.imagePath) {
    console.error("Usage:");
    console.error('  npx ts-node send-image.ts --phone "972501234567" --image "/path/to/image.jpg"');
    console.error('  npx ts-node send-image.ts --phone "972501234567" --image "/path/to/image.jpg" --caption "Check this out!"');
    console.error("");
    console.error("Options:");
    console.error("  --phone <NUMBER>   Phone number (international format, no +)");
    console.error("  --image <PATH>     Path to image file");
    console.error("  --caption <TEXT>   Optional caption for the image");
    console.error("  --dry-run          Preview without sending");
    process.exit(1);
  }

  // Check if file exists
  if (!fs.existsSync(args.imagePath)) {
    console.error(`Error: File not found: ${args.imagePath}`);
    process.exit(1);
  }

  try {
    const chatId = formatChatId(args.phone);
    const fileName = path.basename(args.imagePath);
    const fileSize = fs.statSync(args.imagePath).size;

    console.log(`Sending image to: ${chatId}`);
    console.log(`File: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`);
    if (args.caption) {
      console.log(`Caption: ${args.caption.substring(0, 50)}...`);
    }
    console.log("");

    if (args.dryRun) {
      console.log("✓ [DRY RUN] Would send image");
      return;
    }

    const result = await sendFileByUpload(chatId, args.imagePath, args.caption);
    console.log(`✓ Image sent! ID: ${result.idMessage}`);
    console.log(`  URL: ${result.urlFile}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
