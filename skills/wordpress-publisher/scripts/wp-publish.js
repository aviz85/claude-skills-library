#!/usr/bin/env node

/**
 * WordPress Publisher - Create and publish posts to WordPress
 *
 * Usage:
 *   node wp-publish.js create <title> <html-file> [--publish]
 *   node wp-publish.js publish <post-id>
 *   node wp-publish.js status <post-id>
 *
 * Environment Variables (from .env in skill directory):
 *   WP_URL          - WordPress site URL
 *   WP_USERNAME     - WordPress username
 *   WP_APP_PASSWORD - Application password (no spaces)
 *
 * Options:
 *   --publish       Publish immediately instead of creating draft
 *   --image=<path>  Featured image (uploaded to media library)
 *   --excerpt=<text> Add excerpt/summary
 *   --categories=<ids> Comma-separated category IDs
 *   --tags=<ids>    Comma-separated tag IDs
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env from skill directory
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            process.env[key] = value;
          }
        }
      });
      return true;
    }
  }
  return false;
}

// Make HTTP request to WordPress API
function wpRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const wpUrl = process.env.WP_URL;
    if (!wpUrl) {
      reject(new Error('WP_URL not set in environment'));
      return;
    }

    const url = new URL(wpUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const auth = Buffer.from(
      `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
    ).toString('base64');

    const body = data ? JSON.stringify(data) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `/wp-json/wp/v2${endpoint}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': 'curl/8.7.1'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = httpModule.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode >= 400) {
            reject(new Error(`API Error ${res.statusCode}: ${parsed.message || responseBody}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${responseBody.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// Upload media (image) to WordPress
function uploadMedia(imagePath) {
  return new Promise((resolve, reject) => {
    const wpUrl = process.env.WP_URL;
    if (!wpUrl) {
      reject(new Error('WP_URL not set in environment'));
      return;
    }

    const absolutePath = path.resolve(imagePath);
    if (!fs.existsSync(absolutePath)) {
      reject(new Error(`Image file not found: ${absolutePath}`));
      return;
    }

    const filename = path.basename(absolutePath);
    const ext = path.extname(filename).toLowerCase();

    // Determine MIME type
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const imageData = fs.readFileSync(absolutePath);

    const url = new URL(wpUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const auth = Buffer.from(
      `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
    ).toString('base64');

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: '/wp-json/wp/v2/media',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': imageData.length,
        'User-Agent': 'curl/8.7.1'
      }
    };

    const req = httpModule.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode >= 400) {
            reject(new Error(`Media upload error ${res.statusCode}: ${parsed.message || responseBody}`));
          } else {
            resolve({
              id: parsed.id,
              url: parsed.source_url,
              title: parsed.title.rendered
            });
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${responseBody.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(imageData);
    req.end();
  });
}

// Create a new post (draft or published)
async function createPost(title, content, options = {}) {
  const data = {
    title: title,
    content: content,
    status: options.publish ? 'publish' : 'draft'
  };

  if (options.excerpt) data.excerpt = options.excerpt;
  if (options.categories) data.categories = options.categories;
  if (options.tags) data.tags = options.tags;
  if (options.featuredMedia) data.featured_media = options.featuredMedia;

  const result = await wpRequest('POST', '/posts', data);

  return {
    id: result.id,
    status: result.status,
    link: result.link,
    editLink: `${process.env.WP_URL}/wp-admin/post.php?post=${result.id}&action=edit`,
    previewLink: result.link,
    featuredMedia: result.featured_media || null
  };
}

// Update post status (publish a draft)
async function publishPost(postId) {
  const result = await wpRequest('POST', `/posts/${postId}`, { status: 'publish' });

  return {
    id: result.id,
    status: result.status,
    link: result.link
  };
}

// Get post status
async function getPostStatus(postId) {
  const result = await wpRequest('GET', `/posts/${postId}`);

  return {
    id: result.id,
    title: result.title.rendered,
    status: result.status,
    link: result.link,
    modified: result.modified
  };
}

// Parse command line arguments
function parseArgs(args) {
  const options = {
    command: null,
    title: null,
    contentFile: null,
    postId: null,
    publish: false,
    image: null,
    excerpt: null,
    categories: null,
    tags: null
  };

  const positional = [];

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      switch (key) {
        case 'publish':
          options.publish = true;
          break;
        case 'image':
          options.image = value;
          break;
        case 'excerpt':
          options.excerpt = value;
          break;
        case 'categories':
          options.categories = value.split(',').map(n => parseInt(n, 10));
          break;
        case 'tags':
          options.tags = value.split(',').map(n => parseInt(n, 10));
          break;
      }
    } else {
      positional.push(arg);
    }
  }

  options.command = positional[0];

  if (options.command === 'create') {
    options.title = positional[1];
    options.contentFile = positional[2];
  } else if (options.command === 'publish' || options.command === 'status') {
    options.postId = positional[1];
  }

  return options;
}

// Show help
function showHelp() {
  console.log(`
WordPress Publisher
===================

Create and publish posts to WordPress via REST API.

Commands:
  create <title> <html-file> [options]   Create a new post
  publish <post-id>                       Publish a draft post
  status <post-id>                        Get post status

Options for 'create':
  --publish              Publish immediately (default: draft)
  --image=<path>         Featured image (uploads to media library)
  --excerpt=<text>       Add excerpt/summary
  --categories=<ids>     Comma-separated category IDs
  --tags=<ids>           Comma-separated tag IDs

Environment Variables (set in .env):
  WP_URL                 WordPress site URL
  WP_USERNAME            WordPress username
  WP_APP_PASSWORD        Application password

Examples:
  # Create draft from HTML file
  node wp-publish.js create "My Post Title" content.html

  # Create with featured image
  node wp-publish.js create "My Post Title" content.html --image=cover.jpg

  # Create and publish immediately with image
  node wp-publish.js create "My Post Title" content.html --publish --image=hero.png

  # Publish existing draft
  node wp-publish.js publish 123

  # Check post status
  node wp-publish.js status 123

  # Read content from stdin
  echo "<h1>Hello</h1>" | node wp-publish.js create "Hello Post" -
`);
}

// Read content from file or stdin
async function readContent(filePath) {
  if (filePath === '-') {
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', reject);
    });
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Load environment
  loadEnv();

  // Validate environment
  if (!process.env.WP_URL || !process.env.WP_USERNAME || !process.env.WP_APP_PASSWORD) {
    console.error('Error: Missing required environment variables.');
    console.error('Please set WP_URL, WP_USERNAME, and WP_APP_PASSWORD in .env file.');
    console.error('Location: ~/.claude/skills/wordpress-publisher/.env');
    process.exit(1);
  }

  const options = parseArgs(args);

  try {
    switch (options.command) {
      case 'create': {
        if (!options.title || !options.contentFile) {
          console.error('Error: create requires <title> and <html-file>');
          process.exit(1);
        }

        // Upload featured image if provided
        let featuredMediaId = null;
        if (options.image) {
          console.error(`Uploading featured image: ${options.image}`);
          const media = await uploadMedia(options.image);
          featuredMediaId = media.id;
          console.error(`Image uploaded: ${media.url}`);
        }

        const content = await readContent(options.contentFile);
        const result = await createPost(options.title, content, {
          publish: options.publish,
          excerpt: options.excerpt,
          categories: options.categories,
          tags: options.tags,
          featuredMedia: featuredMediaId
        });

        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'publish': {
        if (!options.postId) {
          console.error('Error: publish requires <post-id>');
          process.exit(1);
        }

        const result = await publishPost(options.postId);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'status': {
        if (!options.postId) {
          console.error('Error: status requires <post-id>');
          process.exit(1);
        }

        const result = await getPostStatus(options.postId);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      default:
        console.error(`Error: Unknown command '${options.command}'`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
