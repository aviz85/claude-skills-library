// To run this code you need to install the following dependencies:
// npm install @google/genai mime dotenv
// npm install -D @types/node typescript ts-node

import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from '@google/genai';
import mime from 'mime';
import { writeFile } from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

function saveBinaryFile(fileName: string, content: Buffer) {
  writeFile(fileName, content, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file ${fileName}:`, err);
      return;
    }
    console.log(`File ${fileName} saved to file system.`);
  });
}

// Parse command line arguments
function parseArgs(args: string[]): { prompt: string; aspectRatio: string; assets: string[] } {
  let aspectRatio = '3:2'; // default - best for most social media
  let assets: string[] = [];
  let promptParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--aspect' || args[i] === '-a') {
      if (args[i + 1]) {
        aspectRatio = args[i + 1];
        i++; // skip next arg
      }
    } else if (args[i] === '--assets') {
      if (args[i + 1]) {
        // Support comma-separated assets or full paths
        assets = args[i + 1].split(',').map(a => a.trim());
        i++; // skip next arg
      }
    } else {
      promptParts.push(args[i]);
    }
  }

  return { prompt: promptParts.join(' '), aspectRatio, assets };
}

async function main() {
  // Get prompt and options from command-line arguments
  const { prompt, aspectRatio, assets } = parseArgs(process.argv.slice(2));

  if (!prompt) {
    console.error('Error: Please provide a prompt as a command-line argument');
    console.error('Usage: npx ts-node generate_poster.ts [--aspect RATIO] [--assets PATH] "your prompt here"');
    console.error('');
    console.error('Options:');
    console.error('  --aspect, -a   Aspect ratio (1:1, 3:2, 2:3, 16:9, 9:16) - default: 3:2');
    console.error('  --assets       Comma-separated paths to reference images');
    console.error('');
    console.error('Examples:');
    console.error('  npx ts-node generate_poster.ts "A sunset over mountains"');
    console.error('  npx ts-node generate_poster.ts --aspect 16:9 "A wide landscape"');
    console.error('  npx ts-node generate_poster.ts --assets "/path/to/avatar.jpg" "Create poster with this character"');
    console.error('  npx ts-node generate_poster.ts --assets "/path/a.jpg,/path/b.png" "Use both images"');
    process.exit(1);
  }

  // Validate aspect ratio
  const validRatios = ['1:1', '3:2', '2:3', '16:9', '9:16'];
  if (!validRatios.includes(aspectRatio)) {
    console.error(`Error: Invalid aspect ratio "${aspectRatio}"`);
    console.error(`Valid options: ${validRatios.join(', ')}`);
    process.exit(1);
  }

  console.log(`Aspect ratio: ${aspectRatio}`);
  if (assets.length > 0) {
    console.log(`Assets: ${assets.join(', ')}`);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY not found in environment variables');
    console.error('Please create a .env file with GEMINI_API_KEY=your_api_key');
    process.exit(1);
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  // Upload asset images if provided
  const uploadedAssets: Array<{ name: string; uri: string; mimeType: string }> = [];

  for (const assetPath of assets) {
    try {
      console.log(`Uploading asset: ${assetPath}...`);
      const uploaded = await ai.files.upload({
        file: assetPath,
        config: { mimeType: mime.getType(assetPath) || 'image/jpeg' },
      });
      uploadedAssets.push({
        name: uploaded.name,
        uri: uploaded.uri,
        mimeType: uploaded.mimeType || 'image/jpeg',
      });
      console.log(`Asset uploaded successfully: ${uploaded.name}`);
    } catch (error) {
      console.error(`Warning: Could not upload asset ${assetPath}:`, error);
    }
  }

  const config = {
    responseModalities: [
        'IMAGE',
        'TEXT',
    ],
    imageConfig: {
      aspectRatio: aspectRatio,
      imageSize: '1K', // default quality
    },
  };

  const model = 'gemini-3-pro-image-preview';

  // Build content parts - include uploaded assets first, then prompt
  const contentParts: Array<any> = [];
  for (const asset of uploadedAssets) {
    contentParts.push(createPartFromUri(asset.uri, asset.mimeType));
  }
  if (uploadedAssets.length > 0) {
    contentParts.push('Use the provided reference image(s) as specified in the prompt.');
  }
  contentParts.push(prompt);

  const contents = createUserContent(contentParts);

  console.log(`Generating poster with prompt: "${prompt}"`);

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  let fileIndex = 0;
  for await (const chunk of response) {
    if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
      continue;
    }
    if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const fileName = `poster_${fileIndex++}`;
      const inlineData = chunk.candidates[0].content.parts[0].inlineData;
      const fileExtension = mime.getExtension(inlineData.mimeType || '');
      const buffer = Buffer.from(inlineData.data || '', 'base64');
      saveBinaryFile(`${fileName}.${fileExtension}`, buffer);
    }
    else {
      console.log(chunk.text);
    }
  }

  // Clean up: delete uploaded asset files
  for (const asset of uploadedAssets) {
    try {
      await ai.files.delete({ name: asset.name });
      console.log(`Asset ${asset.name} cleaned up from server.`);
    } catch (error) {
      console.error(`Warning: Could not delete asset ${asset.name}:`, error);
    }
  }
}

main();
