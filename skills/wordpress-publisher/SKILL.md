---
name: wordpress-publisher
description: "פרסום פוסטים לוורדפרס. השתמש כשמשתמש רוצה לפרסם תוכן, פוסטים או מאמרים לאתר הוורדפרס שלו."
---

# WordPress Publisher

פרסום תוכן לאתרי וורדפרס עם תהליך דו-שלבי: קודם טיוטה, אחר כך פרסום לאחר אישור.

## הגדרות

צור קובץ `.env` בתיקיית הסקיל:

```bash
# ~/.claude/skills/wordpress-publisher/.env
WP_URL=https://your-site.com
WP_USERNAME=your_username
WP_APP_PASSWORD=YourApplicationPasswordNoSpaces
```

**יצירת סיסמת אפליקציה:**
1. לך ל-WordPress Admin → Users → Profile
2. גלול ל-"Application Passwords"
3. הזן שם (למשל "Claude Code") ולחץ "Add New"
4. העתק את הסיסמה והסר את כל הרווחים

## תהליך עבודה

### שלב 1: יצירת טיוטה

```bash
node ~/.claude/skills/wordpress-publisher/scripts/wp-publish.js create "כותרת הפוסט" content.html
```

**תוצאה:**
```json
{
  "id": 123,
  "status": "draft",
  "editLink": "https://your-site.com/wp-admin/post.php?post=123&action=edit",
  "previewLink": "https://your-site.com/?p=123"
}
```

### שלב 2: פרסום (לאחר אישור המשתמש)

```bash
node ~/.claude/skills/wordpress-publisher/scripts/wp-publish.js publish 123
```

**תוצאה:**
```json
{
  "id": 123,
  "status": "publish",
  "link": "https://your-site.com/post-slug/"
}
```

## שימוש מהיר

### יצירת טיוטה מקובץ HTML:
```bash
node ~/.claude/skills/wordpress-publisher/scripts/wp-publish.js create "כותרת" article.html
```

### יצירה ופרסום מיידי:
```bash
node ~/.claude/skills/wordpress-publisher/scripts/wp-publish.js create "כותרת" article.html --publish
```

### יצירה עם תמונה ראשית (Featured Image):
```bash
node ~/.claude/skills/wordpress-publisher/scripts/wp-publish.js create "כותרת" article.html --image=cover.jpg
```

### קריאה מ-stdin (pipe):
```bash
echo "<h1>שלום עולם</h1>" | node ~/.claude/skills/wordpress-publisher/scripts/wp-publish.js create "שלום" -
```

### בדיקת סטטוס פוסט:
```bash
node ~/.claude/skills/wordpress-publisher/scripts/wp-publish.js status 123
```

## אפשרויות

| אפשרות | תיאור |
|--------|-------|
| `--publish` | פרסום מיידי (ברירת מחדל: טיוטה) |
| `--image=<path>` | תמונה ראשית (מועלית לספריית המדיה) |
| `--excerpt=<text>` | הוספת תקציר |
| `--categories=<ids>` | מזהי קטגוריות (מופרדים בפסיק) |
| `--tags=<ids>` | מזהי תגיות (מופרדים בפסיק) |

## פורמט תשובה

### לאחר יצירת טיוטה:
```
הטיוטה נוצרה בהצלחה!

**מזהה פוסט:** 123
**עריכה בוורדפרס:** https://your-site.com/wp-admin/post.php?post=123&action=edit
**תצוגה מקדימה:** https://your-site.com/?p=123

האם לפרסם עכשיו, או שתרצה לעיין קודם?
```

### לאחר פרסום:
```
הפוסט עלה לאוויר!

**כתובת:** https://your-site.com/your-post-slug/
```

## טיפול בשגיאות

| שגיאה | סיבה | פתרון |
|-------|------|-------|
| 401 Unauthorized | פרטי התחברות שגויים | בדוק WP_USERNAME ו-WP_APP_PASSWORD |
| 403 Forbidden | אין הרשאות | ודא שלמשתמש יש תפקיד עורך/מנהל |
| 404 Not Found | כתובת שגויה או API מושבת | בדוק WP_URL, הפעל REST API |

## מתי להשתמש

- משתמש מבקש לפרסם פוסט בבלוג
- משתמש רוצה להעלות תוכן לוורדפרס
- משתמש משתף טקסט/markdown ואומר "פרסם את זה"
- משתמש מזכיר את אתר הוורדפרס שלו

## מידע נוסף

- [מדריך API מפורט](references/api-reference.md) - תיעוד מלא של ה-REST API
