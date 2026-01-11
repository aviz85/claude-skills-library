---
name: wordpress-publisher
description: "Publish posts to WordPress. Use when user wants to publish content, blog posts, or articles to their WordPress site."
---

# WordPress Publisher

Publish content to WordPress sites with a two-step workflow: draft first, then publish on confirmation.

## Configuration

Create a `.env` file in this skill directory with your WordPress credentials:

```bash
# ~/.claude/skills/wordpress-publisher/.env
WP_URL=https://your-site.com
WP_USERNAME=your_username
WP_APP_PASSWORD=YourApplicationPasswordNoSpaces
```

**Getting an Application Password:**
1. Go to WordPress Admin → Users → Profile
2. Scroll to "Application Passwords"
3. Enter a name (e.g., "Claude Code") and click "Add New"
4. Copy the password and remove all spaces

## Workflow

### Step 1: Publish as Draft

When user provides content to publish:

1. **Read the content** - Accept markdown, HTML, or plain text
2. **Convert to HTML** - If markdown, convert using marked library
3. **Create draft post** - POST to WordPress API with `status: draft`
4. **Return preview link** - Give user the direct admin edit link

### Step 2: Make Public (on user confirmation)

When user confirms to publish:
1. **Update post status** - Change from `draft` to `publish`
2. **Return public URL** - Give user the live post link

## API Reference

### Create Draft Post

```javascript
const https = require('https');
const url = new URL(process.env.WP_URL);

const data = JSON.stringify({
  title: 'Post Title',
  content: '<p>HTML content here</p>',
  status: 'draft'
});

const auth = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString('base64');

const options = {
  hostname: url.hostname,
  port: 443,
  path: '/wp-json/wp/v2/posts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Authorization': 'Basic ' + auth
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const result = JSON.parse(body);
    console.log({
      id: result.id,
      editLink: `${process.env.WP_URL}/wp-admin/post.php?post=${result.id}&action=edit`,
      previewLink: result.link
    });
  });
});

req.write(data);
req.end();
```

### Publish Post (Change Status)

```javascript
const data = JSON.stringify({ status: 'publish' });

// Same as above but with:
// path: `/wp-json/wp/v2/posts/${postId}`
```

## Markdown to HTML Conversion

For markdown content, use the marked library:

```javascript
const { marked } = require('marked');
const htmlContent = marked(markdownContent);
```

If marked is not available, install it or use a simple regex-based conversion for basic formatting.

## Content Enhancement

When publishing, enhance the content by:

1. **Add proper title** - Extract from first H1 or ask user
2. **Format code blocks** - Ensure syntax highlighting classes
3. **Handle images** - Keep image URLs intact
4. **Preserve Hebrew/RTL** - Add dir="rtl" for Hebrew content

## Response Format

### After Draft Creation:
```
Draft created successfully!

**Post ID:** 123
**Edit in WordPress:** https://your-site.com/wp-admin/post.php?post=123&action=edit
**Preview:** https://your-site.com/?p=123

Would you like me to publish it now, or do you want to review it first?
```

### After Publishing:
```
Post is now live!

**URL:** https://your-site.com/your-post-slug/
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid credentials | Check WP_USERNAME and WP_APP_PASSWORD |
| 403 Forbidden | User lacks permissions | Ensure user has Editor/Admin role |
| 404 Not Found | Wrong URL or REST API disabled | Check WP_URL, enable REST API |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WP_URL` | Yes | WordPress site URL (no trailing slash) |
| `WP_USERNAME` | Yes | WordPress username |
| `WP_APP_PASSWORD` | Yes | Application password (no spaces) |

## Quick Implementation

```javascript
// Full implementation for publishing
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load env from skill directory
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
}

async function publishToWordPress(title, content, status = 'draft') {
  return new Promise((resolve, reject) => {
    const url = new URL(process.env.WP_URL);
    const data = JSON.stringify({ title, content, status });
    const auth = Buffer.from(
      `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
    ).toString('base64');

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: '/wp-json/wp/v2/posts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': 'Basic ' + auth
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function updatePostStatus(postId, status) {
  return new Promise((resolve, reject) => {
    const url = new URL(process.env.WP_URL);
    const data = JSON.stringify({ status });
    const auth = Buffer.from(
      `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
    ).toString('base64');

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: `/wp-json/wp/v2/posts/${postId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': 'Basic ' + auth
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
```

## When to Use

- User asks to publish a blog post
- User wants to post content to WordPress
- User shares markdown/text and says "publish this"
- User mentions their WordPress site
