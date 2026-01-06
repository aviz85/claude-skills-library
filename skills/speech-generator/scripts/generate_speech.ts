import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.DEFAULT_VOICE_ID;

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  speed?: number;
  use_speaker_boost?: boolean;
}

interface TTSRequest {
  text: string;
  model_id: string;
  voice_settings: VoiceSettings;
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  labels?: Record<string, string>;
}

interface VoicesResponse {
  voices: Voice[];
}

interface Args {
  text?: string;
  file?: string;
  voiceId?: string;
  model?: string;
  output?: string;
  stability?: number;
  similarity?: number;
  style?: number;
  speed?: number;
  format?: string;
  listVoices?: boolean;
  help?: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "-t":
      case "--text":
        result.text = args[++i];
        break;
      case "-f":
      case "--file":
        result.file = args[++i];
        break;
      case "-v":
      case "--voice":
        result.voiceId = args[++i];
        break;
      case "-m":
      case "--model":
        result.model = args[++i];
        break;
      case "-o":
      case "--output":
        result.output = args[++i];
        break;
      case "--stability":
        result.stability = parseFloat(args[++i]);
        break;
      case "--similarity":
        result.similarity = parseFloat(args[++i]);
        break;
      case "--style":
        result.style = parseFloat(args[++i]);
        break;
      case "--speed":
        result.speed = parseFloat(args[++i]);
        break;
      case "--format":
        result.format = args[++i];
        break;
      case "--list-voices":
        result.listVoices = true;
        break;
      case "-h":
      case "--help":
        result.help = true;
        break;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Speech Generator - ElevenLabs Text-to-Speech

Usage:
  npx ts-node generate_speech.ts [options]

Options:
  -t, --text <TEXT>       Text to convert to speech
  -f, --file <PATH>       Read text from file
  -v, --voice <ID>        Voice ID (default: from .env)
  -m, --model <ID>        Model ID (default: eleven_multilingual_v2)
  -o, --output <PATH>     Output file path (required)
  --stability <0-1>       Voice stability (default: 0.5)
  --similarity <0-1>      Similarity boost (default: 0.75)
  --style <0-1>           Style exaggeration (default: 0)
  --speed <0.5-2.0>       Speech speed (default: 1.0)
  --format <FORMAT>       Output format (default: mp3_44100_128)
  --list-voices           List available voices
  -h, --help              Show this help

Examples:
  npx ts-node generate_speech.ts -t "Hello world" -o output.mp3
  npx ts-node generate_speech.ts -f script.txt -v dV1ee5wE1Ag5NSL6L2Z9 -o narration.mp3
  npx ts-node generate_speech.ts --list-voices

Models:
  eleven_multilingual_v2  Best quality, 32 languages (default)
  eleven_flash_v2_5       Fastest, ~75ms latency
  eleven_turbo_v2_5       Fast with good quality

Output Formats:
  mp3_44100_128           MP3, 44.1kHz, 128kbps (default)
  mp3_22050_32            MP3, 22kHz, 32kbps
  pcm_16000               Raw PCM, 16kHz
  pcm_44100               Raw PCM, 44.1kHz
`);
}

async function listVoices(): Promise<void> {
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: {
      "xi-api-key": API_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list voices: ${response.status}`);
  }

  const data = (await response.json()) as VoicesResponse;

  console.log("\n=== Available Voices ===\n");

  // Group by category
  const byCategory: Record<string, Voice[]> = {};
  for (const voice of data.voices) {
    const cat = voice.category || "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(voice);
  }

  for (const [category, voices] of Object.entries(byCategory)) {
    console.log(`\n--- ${category.toUpperCase()} ---`);
    for (const voice of voices) {
      console.log(`  ${voice.voice_id}  ${voice.name}`);
    }
  }

  console.log(`\n\nTotal: ${data.voices.length} voices\n`);
}

async function generateSpeech(
  text: string,
  voiceId: string,
  model: string,
  settings: VoiceSettings,
  outputFormat: string
): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`;

  const body: TTSRequest = {
    text,
    model_id: model,
    voice_settings: settings,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS API failed: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main(): Promise<void> {
  // Validate API key
  if (!API_KEY) {
    console.error("Error: Missing ELEVENLABS_API_KEY in .env file");
    process.exit(1);
  }

  const args = parseArgs();

  // Show help
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // List voices
  if (args.listVoices) {
    await listVoices();
    process.exit(0);
  }

  // Get text
  let text = args.text;
  if (args.file) {
    text = fs.readFileSync(args.file, "utf-8");
  }

  if (!text) {
    console.error("Error: Either --text or --file is required");
    showHelp();
    process.exit(1);
  }

  if (!args.output) {
    console.error("Error: --output is required");
    showHelp();
    process.exit(1);
  }

  // Get voice ID
  const voiceId = args.voiceId || DEFAULT_VOICE_ID;
  if (!voiceId) {
    console.error("Error: Voice ID required. Use --voice or set DEFAULT_VOICE_ID in .env");
    process.exit(1);
  }

  // Settings
  const model = args.model || "eleven_v3";
  const format = args.format || "mp3_44100_128";
  const settings: VoiceSettings = {
    stability: args.stability ?? 0.5,
    similarity_boost: args.similarity ?? 0.75,
    style: args.style ?? 0,
    speed: args.speed ?? 1.0,
    use_speaker_boost: true,
  };

  console.log(`\n=== Generating Speech ===`);
  console.log(`Text: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`);
  console.log(`Voice: ${voiceId}`);
  console.log(`Model: ${model}`);
  console.log(`Output: ${args.output}`);
  console.log(`Format: ${format}`);
  console.log(`Characters: ${text.length}`);
  console.log();

  try {
    const audioBuffer = await generateSpeech(text, voiceId, model, settings, format);

    // Ensure output directory exists
    const outputDir = path.dirname(args.output);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(args.output, audioBuffer);

    const fileSizeKB = Math.round(audioBuffer.length / 1024);
    console.log(`✓ Generated: ${args.output} (${fileSizeKB} KB)`);
  } catch (error) {
    console.error("Error generating speech:", error);
    process.exit(1);
  }
}

main();
