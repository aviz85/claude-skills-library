# WordPress REST API Reference

מדריך מפורט ל-API של וורדפרס לשימוש עם הסקיל.

## אימות (Authentication)

WordPress משתמש ב-Application Passwords לאימות מול ה-REST API.

### יצירת Application Password

1. היכנס לממשק הניהול של וורדפרס
2. לך ל: **Users → Profile**
3. גלול למטה ל-**Application Passwords**
4. הזן שם (למשל "Claude Code")
5. לחץ **Add New**
6. העתק את הסיסמה והסר את הרווחים

### Header לאימות

```
Authorization: Basic <base64(username:app_password)>
```

## Endpoints

### יצירת פוסט

```
POST /wp-json/wp/v2/posts
```

**Body:**
```json
{
  "title": "כותרת הפוסט",
  "content": "<p>תוכן ב-HTML</p>",
  "status": "draft",
  "excerpt": "תקציר (אופציונלי)",
  "categories": [1, 2],
  "tags": [5, 6]
}
```

**Response (201 Created):**
```json
{
  "id": 123,
  "status": "draft",
  "link": "https://your-site.com/?p=123",
  "title": { "rendered": "כותרת הפוסט" },
  "content": { "rendered": "<p>תוכן ב-HTML</p>" }
}
```

### עדכון סטטוס (פרסום)

```
POST /wp-json/wp/v2/posts/{post_id}
```

**Body:**
```json
{
  "status": "publish"
}
```

**Response (200 OK):**
```json
{
  "id": 123,
  "status": "publish",
  "link": "https://your-site.com/post-slug/"
}
```

### קבלת פרטי פוסט

```
GET /wp-json/wp/v2/posts/{post_id}
```

**Response:**
```json
{
  "id": 123,
  "title": { "rendered": "כותרת הפוסט" },
  "status": "publish",
  "link": "https://your-site.com/post-slug/",
  "modified": "2024-01-15T10:30:00"
}
```

### העלאת תמונה (Media)

```
POST /wp-json/wp/v2/media
```

**Headers:**
```
Authorization: Basic <base64(username:app_password)>
Content-Type: image/jpeg  (או image/png, image/gif, image/webp)
Content-Disposition: attachment; filename="image.jpg"
```

**Body:** הקובץ הבינארי של התמונה

**Response (201 Created):**
```json
{
  "id": 456,
  "source_url": "https://your-site.com/wp-content/uploads/2024/01/image.jpg",
  "title": { "rendered": "image" },
  "media_type": "image",
  "mime_type": "image/jpeg"
}
```

### הגדרת תמונה ראשית (Featured Image)

להוספת תמונה ראשית לפוסט, יש להעלות קודם את התמונה ל-Media ואז להגדיר את `featured_media`:

```
POST /wp-json/wp/v2/posts/{post_id}
```

**Body:**
```json
{
  "featured_media": 456
}
```

או בעת יצירת הפוסט:

```json
{
  "title": "כותרת הפוסט",
  "content": "<p>תוכן</p>",
  "status": "draft",
  "featured_media": 456
}
```

## סוגי קבצים נתמכים

| סיומת | MIME Type |
|-------|-----------|
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.png` | `image/png` |
| `.gif` | `image/gif` |
| `.webp` | `image/webp` |
| `.svg` | `image/svg+xml` |

## ערכי סטטוס אפשריים

| סטטוס | תיאור |
|-------|-------|
| `draft` | טיוטה - לא מפורסם |
| `publish` | מפורסם וגלוי לכולם |
| `private` | פרטי - רק למנהלים |
| `pending` | ממתין לאישור |
| `future` | מתוזמן לפרסום עתידי |

## שגיאות נפוצות

| קוד | סיבה | פתרון |
|-----|------|-------|
| 401 | אימות נכשל | בדוק שם משתמש וסיסמת אפליקציה |
| 403 | אין הרשאות | ודא שלמשתמש יש הרשאות עורך או מנהל |
| 404 | לא נמצא | בדוק את כתובת האתר או ש-REST API מופעל |
| 400 | בקשה לא תקינה | בדוק את מבנה ה-JSON |

## המרת Markdown ל-HTML

אם התוכן ב-Markdown, יש להמיר ל-HTML לפני שליחה:

```javascript
const { marked } = require('marked');
const htmlContent = marked(markdownContent);
```

## תמיכה בעברית (RTL)

לתוכן בעברית, הוסף את התגית הבאה בתחילת התוכן:

```html
<div dir="rtl" lang="he">
  <!-- תוכן בעברית -->
</div>
```

## קוד לדוגמה - Node.js מלא

```javascript
const https = require('https');

async function wpRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(process.env.WP_URL);
    const auth = Buffer.from(
      `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
    ).toString('base64');

    const body = data ? JSON.stringify(data) : null;

    const options = {
      hostname: url.hostname,
      port: 443,
      path: `/wp-json/wp/v2${endpoint}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(responseBody);
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode}: ${parsed.message}`));
        } else {
          resolve(parsed);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// יצירת טיוטה
const draft = await wpRequest('POST', '/posts', {
  title: 'כותרת',
  content: '<p>תוכן</p>',
  status: 'draft'
});

// פרסום
const published = await wpRequest('POST', `/posts/${draft.id}`, {
  status: 'publish'
});
```

## משתני סביבה

| משתנה | חובה | תיאור |
|-------|------|-------|
| `WP_URL` | כן | כתובת האתר (ללא / בסוף) |
| `WP_USERNAME` | כן | שם משתמש בוורדפרס |
| `WP_APP_PASSWORD` | כן | סיסמת אפליקציה (ללא רווחים) |
