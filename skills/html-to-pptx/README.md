# HTML to PowerPoint Converter

Convert HTML to PowerPoint (.pptx) with excellent Hebrew/RTL support using [PptxGenJS](https://github.com/gitbrent/PptxGenJS).

## Features

- **Two conversion modes:**
  - **Text mode**: Parses HTML and creates native PPTX elements (editable text, bullets, etc.)
  - **Image mode**: Screenshots HTML pages for pixel-perfect complex layouts
- **Automatic RTL detection**: Detects Hebrew/Arabic and enables RTL mode
- **Hebrew font support**: Uses Heebo font by default for Hebrew content
- **Multiple input sources**: Local files, URLs, or piped content
- **Slide splitting**: Auto-split by sections or custom CSS selectors

## Setup (One-time)

```bash
cd ~/.claude/skills/html-to-pptx && npm install
```

## Quick Usage

### Basic conversion:
```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js input.html output.pptx
```

### Hebrew document with RTL:
```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js hebrew.html presentation.pptx --rtl
```

### Convert URL to PowerPoint:
```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js https://example.com slides.pptx
```

### Pipe HTML content:
```bash
echo "<h1>שלום עולם</h1><p>תוכן בעברית</p>" | node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js - output.pptx --rtl
```

## Conversion Modes

### Text Mode (default for simple HTML)
Parses HTML structure and creates native PowerPoint elements:
- Headings become styled text
- Paragraphs become text boxes
- Lists become bullet points
- **Advantage**: Editable text in PowerPoint

```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js doc.html out.pptx --mode=text
```

### Image Mode (for complex layouts)
Screenshots the HTML and embeds as images:
- Preserves exact visual layout
- Supports CSS animations, SVGs, complex tables
- Long pages are split into multiple slides
- **Advantage**: Pixel-perfect rendering

```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js complex.html out.pptx --mode=image
```

### Auto Mode (default)
Automatically detects the best mode based on content complexity.

## Options Reference

| Option | Description | Default |
|--------|-------------|---------|
| `--mode=<mode>` | Conversion mode: text, image, auto | auto |
| `--rtl` | Force RTL direction for Hebrew/Arabic | auto-detect |
| `--title=<title>` | Presentation title | auto |
| `--author=<author>` | Presentation author | AVIZ |
| `--subject=<subject>` | Presentation subject | - |
| `--layout=<layout>` | LAYOUT_16x9, LAYOUT_4x3, LAYOUT_WIDE | LAYOUT_16x9 |
| `--font=<font>` | Default font | Heebo (Hebrew) / Arial |
| `--font-size=<size>` | Font size in points | 18 |
| `--background=<color>` | Background color (hex, no #) | - |
| `--slide-per=<selector>` | CSS selector to split into slides | - |
| `--wait=<ms>` | Wait time for rendering (image mode) | 2000 |

## Examples

### Basic presentation from HTML:
```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js report.html report.pptx
```

### Hebrew presentation:
```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js hebrew.html slides.pptx --rtl --font=Heebo
```

### Split by sections:
```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js doc.html slides.pptx --slide-per=section
```

### Split by custom class:
```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js doc.html slides.pptx --slide-per=".slide"
```

### Custom styling:
```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js doc.html slides.pptx --font=David --font-size=24 --background=F5F5F5
```

### Complex layout as images:
```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js dashboard.html slides.pptx --mode=image --wait=3000
```

## Hebrew/RTL Best Practices

For best Hebrew rendering in your HTML:

1. **Set lang and dir attributes**: `<html lang="he" dir="rtl">`
2. **Use UTF-8 encoding**: `<meta charset="UTF-8">`
3. **Use Hebrew-supporting fonts**: Heebo, David, Noto Sans Hebrew
4. **Always use `--rtl` flag** for Hebrew content

### Example Hebrew HTML:
```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Heebo', sans-serif;
      direction: rtl;
      text-align: right;
    }
  </style>
</head>
<body>
  <section>
    <h1>כותרת המצגת</h1>
    <p>זהו תוכן בעברית</p>
    <ul>
      <li>נקודה ראשונה</li>
      <li>נקודה שנייה</li>
    </ul>
  </section>
</body>
</html>
```

## Slide Structure

The converter automatically detects slide boundaries using these markers (in order):
1. `<section>` elements
2. `<article>` elements
3. `.slide` class
4. `[data-slide]` attribute
5. `<hr>` elements

Or specify your own with `--slide-per`:
```bash
node ~/.claude/skills/html-to-pptx/scripts/html-to-pptx.js doc.html slides.pptx --slide-per="div.page"
```

## Troubleshooting

### Hebrew text appears reversed
- Use the `--rtl` flag
- Ensure HTML has `dir="rtl"` attribute

### Fonts not rendering correctly
- In image mode, increase `--wait=3000` for font loading
- Use web fonts (Google Fonts) in your HTML

### Complex layouts look wrong in text mode
- Use `--mode=image` for complex CSS layouts
- Image mode preserves exact visual appearance

### Presentation too long
- Use `--slide-per` to control slide breaks
- Structure HTML with `<section>` elements

## Technical Notes

- Uses [PptxGenJS](https://github.com/gitbrent/PptxGenJS) v4.x for PPTX generation
- RTL support via `rtlMode: true` property
- Image mode uses Puppeteer for rendering
- Cheerio for HTML parsing in text mode

## Sources

- [PptxGenJS Documentation](https://gitbrent.github.io/PptxGenJS/)
- [PptxGenJS RTL Support](https://github.com/gitbrent/PptxGenJS/issues/73)
- [html2pptxgenjs](https://github.com/it-beyondit/html2pptxgenjs)
